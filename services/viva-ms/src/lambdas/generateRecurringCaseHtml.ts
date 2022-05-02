import to from 'await-to-js';
import handlebars from '../helpers/htmlTemplate';
import config from '../libs/config';
import log from '../libs/logs';
import { getItem } from '../libs/queries';
import params from '../libs/params';
import S3 from '../libs/S3';
import {
  GetObjectOutput as S3GetObjectOutput,
  PutObjectOutput as S3PutObjectOutput,
} from 'aws-sdk/clients/s3';

import createRecurringCaseTemplate from '../helpers/createRecurringCaseTemplate';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import { getClosedUserCases, updateVivaCaseState } from '../helpers/dynamoDb';
import { AWSError } from 'aws-sdk/lib/error';
import { PromiseResult } from 'aws-sdk/lib/request';

interface CaseItem {
  id: string;
  PK: string;
  SK: string;
  updatedAt: number;
  forms: Record<
    string,
    {
      answers: unknown;
    }
  >;
  currentFormId: string;
}

interface FormAnswer {
  field: {
    id: string;
    tags: string[];
  };
  value: unknown;
}
export interface LambdaRequest {
  detail: {
    caseKeys: {
      PK: string;
      SK: string;
    };
  };
}

export type LambdaResponse = boolean;

export interface Dependencies {
  getStoredUserCase: (
    TableName: string,
    PK: string,
    SK: string
  ) => Promise<[Error, { Item: CaseItem }]>;
  readParams: (id: string) => Promise<{ recurringFormId: string }>;
  getClosedUserCases: (PK: string) => Promise<{ Items: CaseItem[] }>;
  getFile: (bucket: string, key: string) => Promise<PromiseResult<S3GetObjectOutput, AWSError>>;
  storeFile: (
    bucket: string,
    key: string,
    content: string
  ) => Promise<PromiseResult<S3PutObjectOutput, AWSError>>;
  updateVivaCaseState: (caseItem: CaseItem) => Promise<void>;
  putHtmlGeneratedSuccessEvent: (detail: unknown) => Promise<void>;
}

function getChangedCaseAnswerValues(
  currentAnswerList: FormAnswer[],
  previousAnswerList: FormAnswer[]
): FormAnswer[] {
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

function validateRequest(data: LambdaRequest): boolean {
  const isValid = !!data?.detail?.caseKeys?.PK && !!data?.detail?.caseKeys?.SK;
  return isValid;
}

function printErrorAndReturn(msg: string, customData?: unknown): false {
  log.writeError(msg, customData);
  return false;
}

export async function generateRecurringCaseHtml(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<LambdaResponse> {
  if (!validateRequest(input)) {
    return printErrorAndReturn(`invalid input data`, input);
  }

  const { caseKeys } = input.detail;

  const [getCaseItemError, storedUserCase] = await dependencies.getStoredUserCase(
    config.cases.tableName,
    caseKeys.PK,
    caseKeys.SK
  );
  if (!storedUserCase || getCaseItemError) {
    return printErrorAndReturn('Error getting stored case from the cases table', getCaseItemError);
  }

  const { Item: caseItem } = storedUserCase;

  const [paramsReadError, vivaCaseSSMParams] = await to(
    dependencies.readParams(config.cases.providers.viva.envsKeyName)
  );

  if (!vivaCaseSSMParams || paramsReadError) {
    return printErrorAndReturn('Read SSM params failed', paramsReadError);
  }

  const [getClosedCasesError, closedUserCases] = await to(
    dependencies.getClosedUserCases(caseKeys.PK)
  );

  if (!closedUserCases || getClosedCasesError) {
    return printErrorAndReturn(
      'Error getting previous items from the cases table',
      getClosedCasesError
    );
  }

  const { Items: closedCaseList } = closedUserCases;

  const { recurringFormId } = vivaCaseSSMParams;
  let changedAnswerValues = caseItem.forms[caseItem.currentFormId]?.answers ?? [];
  if (closedCaseList.length > 0) {
    const [closedCase] = closedCaseList.sort((caseA, caseB) => caseB.updatedAt - caseA.updatedAt);

    changedAnswerValues = getChangedCaseAnswerValues(
      caseItem.forms[recurringFormId].answers as FormAnswer[],
      closedCase.forms[recurringFormId].answers as FormAnswer[]
    );
  }

  const [s3GetObjectError, hbsTemplateS3Object] = await to(
    dependencies.getFile(
      process.env.PDF_STORAGE_BUCKET_NAME ?? '',
      'templates/ekb-recurring-v2.hbs'
    )
  );
  if (!hbsTemplateS3Object || s3GetObjectError) {
    return printErrorAndReturn('Failed to get handlebar template', s3GetObjectError);
  }

  const handlebarsTemplateFileBody = hbsTemplateS3Object.Body?.toString();
  const template = handlebars.compile(handlebarsTemplateFileBody);

  const caseTemplateData = createRecurringCaseTemplate(caseItem, changedAnswerValues);
  const html = template(caseTemplateData);

  const caseHtmlKey = `html/case-${caseItem.id}.html`;
  const [s3StoreFileError] = await to(
    dependencies.storeFile(process.env.PDF_STORAGE_BUCKET_NAME ?? '', caseHtmlKey, html)
  );
  if (s3StoreFileError) {
    return printErrorAndReturn('Failed to store generated html', s3StoreFileError);
  }

  const [updateCaseError] = await to(dependencies.updateVivaCaseState(caseItem));
  if (updateCaseError) {
    return printErrorAndReturn('Failed to update case state attribute', updateCaseError);
  }

  const [putEventError] = await to(
    dependencies.putHtmlGeneratedSuccessEvent({
      pdfStorageBucketKey: caseHtmlKey,
      keys: {
        PK: caseItem.PK,
        SK: caseItem.SK,
      },
    })
  );
  if (putEventError) {
    return printErrorAndReturn('Failed to put htmlGeneratedSuccess event', putEventError);
  }

  return true;
}

export const main = log.wrap(async event => {
  return generateRecurringCaseHtml(event, {
    getStoredUserCase: getItem,
    readParams: params.read,
    getClosedUserCases,
    getFile: S3.getFile,
    storeFile: S3.storeFile,
    updateVivaCaseState,
    putHtmlGeneratedSuccessEvent: putVivaMsEvent.htmlGeneratedSuccess,
  });
});
