import to from 'await-to-js';

import { VIVA_COMPLETION_RECEIVED, VIVA_RANDOM_CHECK_RECEIVED } from '../libs/constants';
import { getItem as getStoredUserCase } from '../libs/queries';
import params from '../libs/params';
import config from '../libs/config';
import log from '../libs/logs';
import S3 from '../libs/S3';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import { updateCaseState } from '../helpers/dynamoDb';
import caseHelper from '../helpers/createCase';

import { CaseItem, CaseFormAnswer, UploadedFile, CaseForm } from '../types/caseItem';

interface PostCompletionResponse {
  response: {
    status: string;
  };
}

interface S3Attachment {
  id: string;
  name: string;
  category: string;
  fileBase64: unknown;
}

interface GetStoredUserCaseResponse {
  Item: CaseItem;
}

interface ReadParamsResponse {
  randomCheckFormId: string;
  completionFormId: string;
}

interface Dependencies {
  getStoredUserCase: (
    TableName: string,
    PK: string,
    SK: string
  ) => Promise<[Error, GetStoredUserCaseResponse]>;
  readParams: (name: string) => Promise<ReadParamsResponse>;
  postCompletion: ({
    personalNumber,
    workflowId,
    attachments,
  }: {
    personalNumber: string;
    workflowId: string | null | undefined;
    attachments: S3Attachment[];
  }) => Promise<PostCompletionResponse>;
  updateCaseState: (
    caseKeys: { PK: string; SK: string },
    params: {
      currentFormId: string;
      initialCompletionForm: Record<string, CaseForm>;
      newState: string;
    }
  ) => Promise<void>;
}

export const main = log.wrap(async event => {
  return lambda(event, {
    getStoredUserCase,
    readParams: params.read,
    postCompletion: vivaAdapter.completion.post,
    updateCaseState,
  });
});

export async function lambda(event, dependencies: Dependencies) {
  const { caseKeys } = event.detail;
  const { getStoredUserCase, readParams, postCompletion, updateCaseState } = dependencies;

  const [getCaseItemError, { Item: caseItem }] = await getStoredUserCase(
    config.cases.tableName,
    caseKeys.PK,
    caseKeys.SK
  );
  if (getCaseItemError) {
    log.writeError('Error getting stored case from the cases table', getCaseItemError);
    return false;
  }

  if (!caseItem) {
    log.writeError(
      `Requested case item with SK: ${caseKeys.SK}, was not found in the cases table`,
      caseKeys.SK
    );
    return true;
  }

  const [paramsReadError, vivaCaseSSMParams] = await to(
    readParams(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    log.writeError(
      'Read ssm params ´config.cases.providers.viva.envsKeyName´ failed',
      paramsReadError
    );
    return false;
  }

  const { currentFormId } = caseItem;
  const { randomCheckFormId, completionFormId } = vivaCaseSSMParams as ReadParamsResponse;
  const notCompletionForm = ![randomCheckFormId, completionFormId].includes(currentFormId);
  if (notCompletionForm) {
    log.writeError('Current form is not an completion/random check form', currentFormId);
    return true;
  }

  const personalNumber = caseItem.PK.substr(5);
  const caseAnswers = caseItem.forms?.[currentFormId].answers ?? [];

  const [attachmentListError, attachmentList] = await to(
    answersToAttachmentList(personalNumber, caseAnswers)
  );
  if (attachmentListError) {
    log.writeError('Attachment list error', attachmentListError);
    return false;
  }

  const [postCompletionError, postCompletionResponse] = await to(
    postCompletion({
      personalNumber,
      workflowId: caseItem.details?.workflowId,
      attachments: attachmentList ?? [],
    })
  );
  if (postCompletionError) {
    log.writeError('Failed to submit Viva completion application', postCompletionError);
    return false;
  }

  if (notCompletionReceived(postCompletionResponse)) {
    log.writeError('Viva completion receive failed', postCompletionResponse);
    return false;
  }

  const isCoApplicant = false;
  const initialCompletionFormEncryption = caseHelper.getFormEncryptionAttributes(isCoApplicant);
  const initialCompletionForm = caseHelper.getInitialFormAttributes(
    [currentFormId],
    initialCompletionFormEncryption
  );
  const newState = getReceivedState(currentFormId, randomCheckFormId);
  const [updateError] = await to(
    updateCaseState(caseKeys, { currentFormId, initialCompletionForm, newState })
  );
  if (updateError) {
    log.writeError('Failed to update Viva case', updateError);
    return false;
  }

  return true;
}

function getAttachmentCategory(
  tags: string[],
  attachmentCategories = ['expenses', 'incomes', 'completion']
) {
  if (tags && tags.includes('viva') && tags.includes('attachment') && tags.includes('category')) {
    return attachmentCategories.reduce((acc, curr) => {
      if (tags.includes(curr)) {
        return curr;
      }
      return acc;
    });
  }
  return undefined;
}

function generateFileKey(keyPrefix, filename) {
  return `${keyPrefix}/${filename}`;
}

async function answersToAttachmentList(personalNumber: string, answerList: CaseFormAnswer[]) {
  const attachmentList: S3Attachment[] = [];

  for (const answer of answerList) {
    const attachmentCategory = getAttachmentCategory(answer.field.tags);
    if (!attachmentCategory) {
      continue;
    }

    for (const valueItem of answer.value as UploadedFile[]) {
      const s3FileKey = generateFileKey(personalNumber, valueItem.uploadedFileName);

      const [getFileError, file] = await to(S3.getFile(process.env.BUCKET_NAME, s3FileKey));
      if (getFileError) {
        // Throwing the error for a single file would prevent all files from being retrived, since the loop would exit.
        // So instead we log the error and continue the loop iteration.
        log.writeError(`Could not get file with key: ${s3FileKey}`, getFileError);
        continue;
      }

      const attachment = {
        id: s3FileKey,
        name: valueItem.uploadedFileName,
        category: attachmentCategory,
        fileBase64: file.Body.toString('base64'),
      };

      attachmentList.push(attachment);
    }
  }

  return attachmentList;
}

function notCompletionReceived(response) {
  if (response?.status !== 'OK') {
    return true;
  }

  return false;
}

function getReceivedState(currentFormId, randomCheckFormId) {
  return currentFormId === randomCheckFormId
    ? VIVA_RANDOM_CHECK_RECEIVED
    : VIVA_COMPLETION_RECEIVED;
}
