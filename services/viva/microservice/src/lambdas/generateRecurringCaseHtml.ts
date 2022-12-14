import type {
  GetObjectOutput as S3GetObjectOutput,
  PutObjectOutput as S3PutObjectOutput,
} from 'aws-sdk/clients/s3';

import { CASE_HTML_GENERATED } from '../libs/constants';
import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import params from '../libs/params';
import log from '../libs/logs';
import S3 from '../libs/S3';

import createRecurringCaseTemplate from '../helpers/createRecurringCaseTemplate';
import createCaseTemplate from '../helpers/createCaseTemplate';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import { isFormNewApplication } from '../helpers/newApplication';
import handlebars from '../helpers/htmlTemplate';
import { cases } from '../helpers/query';

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
  getCase: (keys: CaseKeys) => Promise<CaseItem>;
  getFormIds: () => Promise<VivaParametersResponse>;
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

export const S3_HANDLEBAR_TEMPLATE_V3 = 'templates/ekb-recurring-v3.hbs';
export const S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED = 'templates/ekb-recurring-v2.hbs';

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

async function getFormIds(): Promise<VivaParametersResponse> {
  const formIds = await params.read(config.cases.providers.viva.envsKeyName);
  return formIds;
}

export async function generateRecurringCaseHtml(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<LambdaResponse> {
  const { caseKeys } = input.detail;

  const caseItem = await dependencies.getCase(caseKeys);
  if (!caseItem) {
    return printErrorAndReturn('Error getting stored case from the cases table');
  }
  const { Items: closedCases } = await dependencies.getClosedCases(caseKeys.PK);

  let changedAnswerValues: CaseFormAnswer[] = [...caseItem.forms[caseItem.currentFormId].answers];

  const formIds = await dependencies.getFormIds();
  const isClosedCases = closedCases.length > 0;

  if (isClosedCases) {
    const [latestClosedCase] = closedCases.sort(
      (caseA, caseB) => caseB.updatedAt - caseA.updatedAt
    );

    changedAnswerValues = getChangedCaseAnswerValues(
      caseItem.forms[formIds.recurringFormId].answers,
      latestClosedCase.forms[
        isFormNewApplication(formIds, latestClosedCase.currentFormId)
          ? formIds.newApplicationFormId
          : formIds.recurringFormId
      ].answers
    );
  }

  const isCurrentCaseNewApplication = isFormNewApplication(formIds, caseItem.currentFormId);

  const handlebarTemplate = isCurrentCaseNewApplication
    ? S3_HANDLEBAR_TEMPLATE_V3
    : S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED;

  const hbsTemplateS3Object = await dependencies.getFile(
    process.env.PDF_STORAGE_BUCKET_NAME ?? '',
    handlebarTemplate
  );
  if (!hbsTemplateS3Object) {
    return printErrorAndReturn('Failed to get handlebar template');
  }

  const caseTemplateDataFunction = dependencies.getCaseTemplateFunction(
    isCurrentCaseNewApplication
  );
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
    getCase: cases.get,
    getFormIds,
    getClosedCases,
    getFile: S3.getFile,
    storeFile: S3.storeFile,
    updateCaseState,
    generateSuccess: putVivaMsEvent.htmlGeneratedSuccess,
    getCaseTemplateFunction,
  });
});
