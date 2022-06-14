/* eslint-disable no-console */
import { BadRequestError, ForbiddenError } from '@helsingborg-stad/npm-api-error-handling';
import config from '../libs/config';
import log from '../libs/logs';
import { decodeToken, Token } from '../libs/token';
import { populateFormWithPreviousCaseAnswers } from '../libs/formAnswers';
import * as response from '../libs/response';
import * as dynamoDb from '../libs/dynamoDb';

import { cases } from '../helpers/query';
import { getFormTemplates } from '../helpers/dynamoDb';
import { VIVA_STATUS_NEW_APPLICATION_OPEN } from '../helpers/constants';
import validateApplicationStatus from '../helpers/validateApplicationStatus';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

import { CasePersonRole } from '../types/caseItem';
import type { CaseItem, CasePerson, CaseForm } from '../types/caseItem';

type CaseKeys = Pick<CaseItem, 'PK' | 'SK'>;

interface AddCasePersonRequest {
  personalNumber: string;
  firstName: string;
  lastName: string;
}

export interface LambdaRequest {
  body: string;
  pathParameters: {
    caseId: string;
  };
  headers: {
    Authorization: string;
  };
}

interface LambdaResponse {
  type: string;
  attributes: {
    caseItem: CaseItem;
  };
}

interface UpdateCaseAddPersonResponse {
  Attributes: CaseItem;
}

interface UpdateCaseParameters {
  caseKeys: CaseKeys;
  coApplicant: CasePerson;
  form: Record<string, CaseForm>;
}

export interface Dependencies {
  decodeToken: (params: LambdaRequest) => Token;
  updateCase: (params: UpdateCaseParameters) => Promise<UpdateCaseAddPersonResponse>;
  coApplicantStatus: (personalNumber: string) => Promise<unknown>;
  validateCoApplicantStatus: (statusList: unknown, requiredCodeList: unknown) => boolean;
  getCase: (keys: CaseKeys) => Promise<CaseItem>;
  getFormTemplates: typeof getFormTemplates;
  populateForm: typeof populateFormWithPreviousCaseAnswers;
}

function updateCase(params: UpdateCaseParameters): Promise<UpdateCaseAddPersonResponse> {
  const { caseKeys, coApplicant, form } = params;
  const [newApplicationFormId] = Object.keys(form);

  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression:
      'SET forms.#newApplicationFormId = :newForm, persons = list_append(persons, :coApplicant), GSI1 = :personalNumberGSI1',
    ExpressionAttributeNames: {
      '#newApplicationFormId': newApplicationFormId,
    },
    ExpressionAttributeValues: {
      ':coApplicant': [coApplicant],
      ':personalNumberGSI1': coApplicant.personalNumber,
      ':newForm': form[newApplicationFormId],
    },
    ReturnValues: 'ALL_NEW',
  };

  return dynamoDb.call('update', updateParams);
}

export async function addCasePerson(input: LambdaRequest, dependencies: Dependencies) {
  const {
    getCase,
    decodeToken,
    getFormTemplates,
    coApplicantStatus,
    validateCoApplicantStatus,
    updateCase,
  } = dependencies;

  const applicant = decodeToken(input);
  const coApplicantRequestBody = JSON.parse(input.body) as AddCasePersonRequest;

  const isApplicantAndCoApplicantTheSamePerson =
    applicant.personalNumber === coApplicantRequestBody.personalNumber;
  if (isApplicantAndCoApplicantTheSamePerson) {
    const message = process.env.badRequestMessage ?? '';
    return response.failure(new BadRequestError(message));
  }

  const statusList = await coApplicantStatus(coApplicantRequestBody.personalNumber);
  const coApplicantAllowedStatusCode = [VIVA_STATUS_NEW_APPLICATION_OPEN];
  if (!validateCoApplicantStatus(statusList, coApplicantAllowedStatusCode)) {
    const message = process.env.forbiddenMessage ?? '';
    return response.failure(new ForbiddenError(message));
  }

  const caseKeys: CaseKeys = {
    PK: `USER#${applicant.personalNumber}`,
    SK: `CASE#${input.pathParameters.caseId}`,
  };

  const caseItem = await getCase(caseKeys);

  const caseForm = {
    [caseItem.currentFormId]: caseItem.forms?.[caseItem.currentFormId],
  } as Record<string, CaseForm>;

  const coApplicant: CasePerson = {
    personalNumber: coApplicantRequestBody.personalNumber,
    firstName: coApplicantRequestBody.firstName,
    lastName: coApplicantRequestBody.lastName,
    role: CasePersonRole.CoApplicant,
    hasSigned: false,
  };

  const formTemplates = (await getFormTemplates([caseItem.currentFormId])) as Record<
    string,
    CaseForm
  >;

  const prePopulatedFormWithCoApplicant: Record<string, CaseForm> =
    populateFormWithPreviousCaseAnswers(caseForm, [coApplicant], formTemplates, {});

  const updateCaseResult = await updateCase({
    caseKeys,
    coApplicant,
    form: prePopulatedFormWithCoApplicant,
  });

  const responseBody: LambdaResponse = {
    type: 'addCasePerson',
    attributes: {
      caseItem: updateCaseResult.Attributes,
    },
  };

  return response.success(200, responseBody);
}

export const main = log.wrap(async event => {
  return addCasePerson(event, {
    decodeToken,
    updateCase,
    getFormTemplates,
    coApplicantStatus: vivaAdapter.application.status,
    validateCoApplicantStatus: validateApplicationStatus,
    getCase: cases.get,
    populateForm: populateFormWithPreviousCaseAnswers,
  });
});
