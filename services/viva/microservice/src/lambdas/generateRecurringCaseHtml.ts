import {
  GetObjectOutput as S3GetObjectOutput,
  PutObjectOutput as S3PutObjectOutput,
} from 'aws-sdk/clients/s3';

import { CASE_HTML_GENERATED } from '../libs/constants';
import * as dynamoDb from '../libs/dynamoDb';
import { getItem } from '../libs/queries';
import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';
import S3 from '../libs/S3';

import createRecurringCaseTemplate from '../helpers/createRecurringCaseTemplate';
import createCaseTemplate from '../helpers/createCaseTemplate';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import handlebars from '../helpers/htmlTemplate';

import type { VivaParametersResponse } from '../types/ssmParameters';
import type { CaseFormAnswer, CaseItem } from '../types/caseItem';
import type { PromiseResult } from 'aws-sdk/lib/request';
import type { Template } from '../helpers/createCaseTemplate';
import type { AWSError } from 'aws-sdk/lib/error';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetail {
  caseKeys: CaseKeys;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export type LambdaResponse = boolean;

type CaseTemplateDataFunction = (caseItem: CaseItem, answers: CaseFormAnswer[]) => Template;

interface SuccessEvent {
  pdfStorageBucketKey: string;
  keys: CaseKeys;
}

export interface Dependencies {
  getCase: (TableName: string, PK: string, SK: string) => Promise<[Error, { Item: CaseItem }]>;
  readParams: (id: string) => Promise<VivaParametersResponse>;
  getClosedCases: (PK: string) => Promise<{ Items: CaseItem[] }>;
  getFile: (bucket: string, key: string) => Promise<PromiseResult<S3GetObjectOutput, AWSError>>;
  storeFile: (
    bucket: string,
    key: string,
    content: string
  ) => Promise<PromiseResult<S3PutObjectOutput, AWSError>>;
  updateCaseState: (caseItem: CaseItem) => Promise<void>;
  generateSuccess: (detail: SuccessEvent) => Promise<void>;
  getCaseTemplateFunction: (isNewApplication: boolean) => CaseTemplateDataFunction;
}

const S3_HANDLEBAR_TEMPLATE_V3 = 'templates/ekb-recurring-v3.hbs';
const S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED = 'templates/ekb-recurring-v2.hbs';

function getChangedCaseAnswerValues(
  currentAnswerList: CaseFormAnswer[],
  previousAnswerList: CaseFormAnswer[]
): CaseFormAnswer[] {
  return currentAnswerList.map(currentAnswer => {
    const tags = [...currentAnswer.field.tags];

    const previousAnswer = previousAnswerList.find(
      previousAnswer => previousAnswer.field.id === currentAnswer.field.id
    );

    if (previousAnswer?.value !== currentAnswer.value) {
      tags.push('changed');
    }

    return {
      ...currentAnswer,
      field: {
        ...currentAnswer.field,
        tags,
      },
    };
  });
}

function printErrorAndReturn(msg: string, customData?: unknown): false {
  log.writeError(msg, customData);
  return false;
}

function getCaseTemplateFunction(isNewApplication: boolean): CaseTemplateDataFunction {
  return isNewApplication
    ? createCaseTemplate
    : (createRecurringCaseTemplate as unknown as CaseTemplateDataFunction);
}

function updateCaseState(caseItem: CaseItem) {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseItem.PK,
      SK: caseItem.SK,
    },
    UpdateExpression: 'SET #state = :newState, updatedAt = :newUpdatedAt',
    ExpressionAttributeNames: {
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newState': CASE_HTML_GENERATED,

      ':newUpdatedAt': Date.now(),
    },
    ReturnValues: 'NONE',
  };
  return dynamoDb.call('update', updateParams);
}

function getClosedCases(partitionKey: string) {
  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'begins_with(#status.#type, :statusTypeClosed)',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': partitionKey,
      ':statusTypeClosed': 'closed',
    },
  };
  return dynamoDb.call('query', queryParams);
}

export async function generateRecurringCaseHtml(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<LambdaResponse> {
  const { caseKeys } = input.detail;

  const [getCaseItemError, storedUserCase] = await dependencies.getCase(
    config.cases.tableName,
    caseKeys.PK,
    caseKeys.SK
  );
  if (getCaseItemError) {
    return printErrorAndReturn('Error getting stored case from the cases table', getCaseItemError);
  }
  const { Item: caseItem } = storedUserCase;

  const closedUserCases = await dependencies.getClosedCases(caseKeys.PK);
  const { Items: closedCaseList } = closedUserCases;

  const { recurringFormId, newApplicationFormId } = await dependencies.readParams(
    config.cases.providers.viva.envsKeyName
  );
  let changedAnswerValues: CaseFormAnswer[] = [...caseItem.forms[caseItem.currentFormId].answers];

  if (closedCaseList.length > 0) {
    const [closedCase] = closedCaseList.sort((caseA, caseB) => caseB.updatedAt - caseA.updatedAt);

    changedAnswerValues = getChangedCaseAnswerValues(
      caseItem.forms[recurringFormId].answers as CaseFormAnswer[],
      closedCase.forms[recurringFormId].answers as CaseFormAnswer[]
    );
  }

  const isNewApplication = caseItem.currentFormId === newApplicationFormId;
  const handlebarTemplate = isNewApplication
    ? S3_HANDLEBAR_TEMPLATE_V3
    : S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED;

  const hbsTemplateS3Object = await dependencies.getFile(
    process.env.PDF_STORAGE_BUCKET_NAME ?? '',
    handlebarTemplate
  );
  if (!hbsTemplateS3Object) {
    return printErrorAndReturn('Failed to get handlebar template');
  }

  const caseTemplateDataFunction = dependencies.getCaseTemplateFunction(isNewApplication);
  const caseTemplateData = caseTemplateDataFunction(caseItem, changedAnswerValues);

  const handlebarsTemplateFileBody = hbsTemplateS3Object.Body?.toString();
  const template = handlebars.compile(handlebarsTemplateFileBody);
  const html = template(caseTemplateData);

  const caseHtmlKey = `html/case-${caseItem.id}.html`;
  await dependencies.storeFile(process.env.PDF_STORAGE_BUCKET_NAME ?? '', caseHtmlKey, html);
  await dependencies.updateCaseState(caseItem);
  await dependencies.generateSuccess({
    pdfStorageBucketKey: caseHtmlKey,
    keys: {
      PK: caseItem.PK,
      SK: caseItem.SK,
    },
  });

  return true;
}

export const main = log.wrap(event => {
  return generateRecurringCaseHtml(event, {
    getCase: getItem,
    readParams: params.read,
    getClosedCases,
    getFile: S3.getFile,
    storeFile: S3.storeFile,
    updateCaseState,
    generateSuccess: putVivaMsEvent.htmlGeneratedSuccess,
    getCaseTemplateFunction,
  });
});
