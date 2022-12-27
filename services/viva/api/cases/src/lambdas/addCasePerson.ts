import { BadRequestError, ForbiddenError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../libs/config';
import log from '../libs/logs';
import type { Token } from '../libs/token';
import { decodeToken } from '../libs/token';
import { objectWithoutProperties } from '../libs/objects';
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
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';

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

type CaseWithOmittedProperties = Omit<CaseItem, 'PK' | 'SK' | 'GSI1'>;

interface LambdaResponse {
  type: string;
  attributes: {
    caseItem: CaseWithOmittedProperties;
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
  coApplicantStatus: (personalNumber: string) => Promise<VivaApplicationsStatusItem[]>;
  validateCoApplicantStatus: typeof validateApplicationStatus;
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
      ':personalNumberGSI1': `USER#${coApplicant.personalNumber}`,
      ':newForm': form[newApplicationFormId],
    },
    ReturnValues: 'ALL_NEW',
  };

  return dynamoDb.call('update', updateParams);
}

export async function addCasePerson(input: LambdaRequest, dependencies: Dependencies) {
  const applicant = dependencies.decodeToken(input);
  const coApplicantRequestBody = JSON.parse(input.body) as AddCasePersonRequest;

  const isApplicantAndCoApplicantTheSamePerson =
    applicant.personalNumber === coApplicantRequestBody.personalNumber;
  if (isApplicantAndCoApplicantTheSamePerson) {
    const message = process.env.badRequestMessage ?? '';
    return response.failure(new BadRequestError(message));
  }

  const statusList = await dependencies.coApplicantStatus(coApplicantRequestBody.personalNumber);

  const coApplicantAllowedStatusCode = [VIVA_STATUS_NEW_APPLICATION_OPEN];
  const isApplicantAllowedToApply = !dependencies.validateCoApplicantStatus(
    statusList,
    coApplicantAllowedStatusCode
  );
  if (isApplicantAllowedToApply) {
    const message = process.env.forbiddenMessage ?? '';
    return response.failure(new ForbiddenError(message));
  }

  const caseKeys: CaseKeys = {
    PK: `USER#${applicant.personalNumber}`,
    SK: `CASE#${input.pathParameters.caseId}`,
  };

  const caseItem = await dependencies.getCase(caseKeys);

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

  const formTemplates = (await dependencies.getFormTemplates([caseItem.currentFormId])) as Record<
    string,
    CaseForm
  >;

  const formWithCoApplicant: Record<string, CaseForm> = dependencies.populateForm({
    forms: caseForm,
    applicants: [coApplicant],
    formTemplates,
    previousForms: {},
  });

  const updateCaseResult = await dependencies.updateCase({
    caseKeys,
    coApplicant,
    form: formWithCoApplicant,
  });

  const caseWithoutProperties = objectWithoutProperties(updateCaseResult.Attributes, [
    'PK',
    'SK',
    'GSI1',
  ]);

  const responseBody: LambdaResponse = {
    type: 'addCasePerson',
    attributes: {
      caseItem: caseWithoutProperties as unknown as CaseWithOmittedProperties,
    },
  };

  return response.success(200, responseBody);
}

export const main = log.wrap(async event => {
  return addCasePerson(event, {
    decodeToken,
    updateCase,
    getFormTemplates,
    coApplicantStatus: vivaAdapter.applications.status,
    validateCoApplicantStatus: validateApplicationStatus,
    getCase: cases.get,
    populateForm: populateFormWithPreviousCaseAnswers,
  });
});
