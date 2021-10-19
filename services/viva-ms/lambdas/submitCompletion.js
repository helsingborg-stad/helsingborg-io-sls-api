/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';
import params from '../../../libs/params';
import S3 from '../../../libs/S3';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);
const VIVA_COMPLETION_RECEIVED = 'VIVA_COMPLETION_RECEIVED';

export async function main(event, context) {
  const caseItem = parseDynamoDBItemFromEvent(event);

  const { completionFormId } = await VIVA_CASE_SSM_PARAMS;
  if (caseItem.currentFormId !== completionFormId) {
    log.info('Current form is not an completion form.', context.awsRequestId, null);
    return true;
  }

  const personalNumber = caseItem.PK.substr(5);
  const caseAnswers = caseItem.forms[caseItem.currentFormId].answers;

  const [attachmentListError, attachmentList] = await to(
    answersToAttachmentList(personalNumber, caseAnswers)
  );
  if (attachmentListError) {
    log.error(
      'Attachment list error',
      context.awsRequestId,
      'service-viva-ms-submitCompletition-001',
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
      'post completion error',
      context.awsRequestId,
      'service-viva-ms-submitCompletition-002',
      postCompletionError
    );
    return false;
  }

  if (notCompletionReceived(postCompletionResponse)) {
    log.error(
      'Viva completion receive failed',
      context.awsRequestId,
      'service-viva-ms-submitCompletition-003',
      postCompletionResponse
    );
    return false;
  }

  const caseKeys = {
    PK: caseItem.PK,
    SK: caseItem.SK,
  };
  const [updateError, newVivaCase] = await to(updateVivaCase(caseKeys, VIVA_COMPLETION_RECEIVED));
  if (updateError) {
    log.error(
      'Database update viva case failed',
      context.awsRequestId,
      'service-viva-ms-submitCompletition-004',
      updateError
    );
    return false;
  }

  log.info('Updated viva case successfully', context.awsRequestId, null, newVivaCase);
  return true;
}

function parseDynamoDBItemFromEvent(event) {
  if (event.detail.dynamodb.NewImage === undefined) {
    throw 'Could not read dynamoDB image from event details';
  }
  const dynamoDBItem = AWS.DynamoDB.Converter.unmarshall(event.detail.dynamodb.NewImage);
  return dynamoDBItem;
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

function updateVivaCase(caseKeys, newState) {
  const params = {
    TableName: config.cases.tableName,
    Key: caseKeys,
    UpdateExpression: 'SET #state = :newState',
    ExpressionAttributeNames: {
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newState': newState,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return dynamoDb.call('update', params);
}
