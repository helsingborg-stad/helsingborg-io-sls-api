import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import S3 from '../../../libs/S3';
import log from '../../../libs/logs';
import { PDF_GENERATED, PDF_NOT_GENERATED } from '../../../libs/constants';

export async function main(event, context) {
  const { resourceId, pdfStorageBucketKey } = event.detail;

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

  const [scanCasesByIdError, scanCasesResult] = await to(scanCasesById(resourceId));
  if (scanCasesByIdError) {
    log.error(
      `Failed to scan for case with id: ${resourceId}`,
      context.awsRequestId,
      'service-case-ms-002',
      scanCasesByIdError
    );
    return false;
  }

  const [currentCase] = scanCasesResult.Items;
  const [updateCaseAttributesError] = await to(updateCaseAttributes(currentCase, pdfS3Object.Body));
  if (updateCaseAttributesError) {
    log.error(
      `Failed to update case with id: ${currentCase.id}`,
      context.awsRequestId,
      'service-case-ms-003',
      updateCaseAttributesError
    );
    return false;
  }

  return true;
}

function scanCasesById(caseId) {
  const scanParams = {
    TableName: config.cases.tableName,
    FilterExpression: '#id = :id',
    ExpressionAttributeNames: {
      '#id': 'id',
    },
    ExpressionAttributeValues: {
      ':id': caseId,
    },
  };

  return dynamoDb.call('scan', scanParams);
}

function updateCaseAttributes(caseItem, pdf) {
  const isPdf = !!pdf;
  const newState = isPdf ? PDF_GENERATED : PDF_NOT_GENERATED;

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseItem.PK,
      SK: caseItem.SK,
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
