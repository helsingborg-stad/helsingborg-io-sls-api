import { s3Client } from '../../../libs/S3';
import * as dynamoDb from '../../../libs/dynamoDb';
import config from '../../../config';
import { to } from 'await-to-js';

export async function main(event) {
  const { resourceId, pdfStorageBucketKey } = event.details;

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

  const currentCase = scanCasesResult[1].Items;

  const [updateCasePdfAttributesError] = await to(
    updateCasePdfAttributes(currentCase, pdfObject.Body)
  );
  if (updateCasePdfAttributesError) {
    console.error(updateCasePdfAttributesError);
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

async function updateCasePdfAttributes(currentCase, pdf) {
  const UpdateExpression = 'SET #pdf = :pdf, #pdfGenerated = :pdfGenerated';
  const ExpressionAttributeNames = { '#pdf': 'pdf', '#pdfGenerated': 'pdfGenerated' };
  const ExpressionAttributeValues = {
    ':pdf': pdf || undefined,
    ':pdfGenerated': pdf !== undefined ? 'yes' : 'no',
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
