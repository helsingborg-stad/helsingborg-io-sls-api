import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import { s3Client } from '../../../libs/S3';
import { PDF_GENERATED, PDF_NOT_GENERATED } from '../../../libs/constants';

export async function main(event) {
  const { resourceId, pdfStorageBucketKey } = event.detail;

  const [s3GetObjectError, pdfObject] = await to(
    s3Client
      .getObject({
        Bucket: process.env.PDF_STORAGE_BUCKET_NAME,
        Key: pdfStorageBucketKey,
      })
      .promise()
  );
  if (s3GetObjectError) {
    console.error(s3GetObjectError);
    return false;
  }

  const [scanCasesByIdError, scanCasesResult] = await to(scanCasesById(resourceId));
  if (scanCasesByIdError) {
    console.error(scanCasesByIdError);
    return false;
  }

  const [currentCase] = scanCasesResult.Items;

  const [updateCaseAttributesError] = await to(updateCaseAttributes(currentCase, pdfObject.Body));
  if (updateCaseAttributesError) {
    console.error(updateCaseAttributesError);
    return false;
  }
}

async function scanCasesById(caseId) {
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

async function updateCaseAttributes(currentCase, pdf) {
  const isPdf = !!pdf;
  const newState = `${isPdf ? PDF_GENERATED : PDF_NOT_GENERATED}#${currentCase.state}`;

  const UpdateExpression =
    'SET #pdf = :newPdf, #pdfGenerated = :newPdfGenerated, #state = :newState';
  const ExpressionAttributeNames = {
    '#pdf': 'pdf',
    '#pdfGenerated': 'pdfGenerated',
    '#state': 'state',
  };
  const ExpressionAttributeValues = {
    ':newPdf': pdf || undefined,
    ':newPdfGenerated': isPdf ? 'yes' : 'no',
    ':newState': newState,
  };

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: currentCase.PK,
      SK: currentCase.SK,
    },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValue: 'NONE',
  };

  return dynamoDb.call('update', params);
}
