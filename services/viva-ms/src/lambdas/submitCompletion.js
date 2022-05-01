/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import log from '../libs/logs';
import { getItem as getStoredUserCase } from '../libs/queries';
import params from '../libs/params';
import S3 from '../libs/S3';
import { VIVA_COMPLETION_RECEIVED, VIVA_RANDOM_CHECK_RECEIVED } from '../libs/constants';
import caseHelper from '../helpers/createCase';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event, context) {
  const { caseKeys } = event.detail;

  const [getCaseItemError, { Item: caseItem }] = await getStoredUserCase(
    config.cases.tableName,
    caseKeys.PK,
    caseKeys.SK
  );
  if (getCaseItemError) {
    log.error(
      'Error getting stored case from the cases table',
      context.awsRequestId,
      'service-viva-ms-submitCompletion-001',
      getCaseItemError
    );
    return false;
  }

  const caseItemExists = !!caseItem;
  if (caseItemExists === false) {
    log.warn(
      `Requested case item with SK: ${caseKeys.SK}, was not found in the cases table`,
      context.awsRequestId,
      'service-viva-ms-submitCompletition-002',
      caseKeys.SK
    );
    return true;
  }

  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    log.error(
      'Read ssm params ´config.cases.providers.viva.envsKeyName´ failed',
      context.awsRequestId,
      'service-viva-ms-submitCompletition-003',
      paramsReadError
    );
    return false;
  }

  const { currentFormId } = caseItem;
  const { randomCheckFormId, completionFormId } = vivaCaseSSMParams;
  const notCompletionForm = ![randomCheckFormId, completionFormId].includes(currentFormId);
  if (notCompletionForm) {
    log.info(
      'Current form is not an completion/random check form',
      context.awsRequestId,
      'service-viva-ms-submitCompletion-004',
      currentFormId
    );
    return true;
  }

  const personalNumber = caseItem.PK.substr(5);
  const caseAnswers = caseItem.forms[currentFormId].answers;

  const [attachmentListError, attachmentList] = await to(
    answersToAttachmentList(personalNumber, caseAnswers)
  );
  if (attachmentListError) {
    log.error(
      'Attachment list error',
      context.awsRequestId,
      'service-viva-ms-submitCompletion-005',
      attachmentListError
    );
    return false;
  }

  const [postCompletionError, postCompletionResponse] = await to(
    vivaAdapter.completion.post({
      personalNumber,
      workflowId: caseItem.details.workflowId,
      attachments: attachmentList,
    })
  );
  if (postCompletionError) {
    log.error(
      'Failed to submit Viva completion application',
      context.awsRequestId,
      'service-viva-ms-submitCompletion-006',
      postCompletionError
    );
    return false;
  }

  if (notCompletionReceived(postCompletionResponse)) {
    log.error(
      'Viva completion receive failed',
      context.awsRequestId,
      'service-viva-ms-submitCompletion-007',
      postCompletionResponse
    );
    return false;
  }

  const isCoApplicant = false;
  const initialCompletionFormEncryption = caseHelper.getFormEncryptionAttributes(isCoApplicant);
  const initialCompletionFormList = caseHelper.getInitialFormAttributes(
    [currentFormId],
    initialCompletionFormEncryption
  );
  const newState = getReceivedState(currentFormId, randomCheckFormId);
  const resetedCompletionForm = initialCompletionFormList[0];
  const [updateError] = await to(
    updateCase(caseKeys, { currentFormId, resetedCompletionForm, newState })
  );
  if (updateError) {
    log.error(
      'Failed to update Viva case',
      context.awsRequestId,
      'service-viva-ms-submitCompletion-008',
      updateError
    );
    return false;
  }

  return true;
}

function getAttachmentCategory(tags, attachmentCategories = ['expenses', 'incomes', 'completion']) {
  if (tags && tags.includes('viva') && tags.includes('attachment') && tags.includes('category')) {
    return attachmentCategories.reduce((acc, curr) => {
      if (tags.includes(curr)) {
        return curr;
      }
      return acc;
    }, undefined);
  }
  return undefined;
}

function generateFileKey(keyPrefix, filename) {
  return `${keyPrefix}/${filename}`;
}

async function answersToAttachmentList(personalNumber, answerList) {
  const attachmentList = [];

  for (const answer of answerList) {
    const attachmentCategory = getAttachmentCategory(answer.field.tags);
    if (!attachmentCategory) {
      continue;
    }

    for (const valueItem of answer.value) {
      const s3FileKey = generateFileKey(personalNumber, valueItem.uploadedFileName);

      const [getFileError, file] = await to(S3.getFile(process.env.BUCKET_NAME, s3FileKey));
      if (getFileError) {
        // Throwing the error for a single file would prevent all files from being retrived, since the loop would exit.
        // So instead we log the error and continue the loop iteration.
        console.error(s3FileKey, getFileError);
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

function updateCase(caseKeys, { currentFormId, resetedCompletionForm, newState }) {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression: 'SET #state = :newState, forms.#formId = :resetedCompletionForm',
    ExpressionAttributeNames: {
      '#state': 'state',
      '#formId': currentFormId,
    },
    ExpressionAttributeValues: {
      ':newState': newState,
      ':resetedCompletionForm': resetedCompletionForm,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}
