/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import S3 from '../libs/S3';
import log from '../libs/logs';
import { PDF_GENERATED, PDF_NOT_GENERATED } from '../libs/constants';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface CaseRequest {
  detail: {
    keys: CaseKeys;
    pdfStorageBucketKey: string;
  };
}
export async function main(event: CaseRequest, context: { awsRequestId: string }) {
  const { keys: caseKeys, pdfStorageBucketKey } = event.detail;

  if (!caseKeys?.PK) {
    console.error('Missing attribute PK in event.detial.keys');
    return false;
  }

  if (!caseKeys?.SK) {
    console.error('Missing attribute SK in event.detial.keys');
    return false;
  }

  const [getFileS3Error, pdfS3Object] = await to(
    S3.getFile(process.env.PDF_STORAGE_BUCKET_NAME, pdfStorageBucketKey)
  );
  if (getFileS3Error) {
    log.error(
      `Failed to get file: ${pdfStorageBucketKey}, from S3 bucket`,
      context.awsRequestId,
      'service-case-ms-001',
      getFileS3Error
    );
    return false;
  }

  const [updateCaseAttributesError] = await to(updateCasePdfAttributes(caseKeys, pdfS3Object.Body));
  if (updateCaseAttributesError) {
    log.error(
      'Failed to update case',
      context.awsRequestId,
      'service-case-ms-003',
      updateCaseAttributesError
    );
    return false;
  }

  return true;
}

function updateCasePdfAttributes(caseKeys: CaseKeys, pdf: string) {
  const isPdf = !!pdf;
  const newState = isPdf ? PDF_GENERATED : PDF_NOT_GENERATED;

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression: 'SET #pdf = :newPdf, #state = :newState',
    ExpressionAttributeNames: {
      '#pdf': 'pdf',
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newPdf': pdf || undefined,
      ':newState': newState,
    },
    ReturnValue: 'NONE',
  };

  return dynamoDb.call('update', params);
}
