import { s3Client } from '../../../libs/S3';
import * as dynamoDb from '../../../libs/dynamoDb';
import config from '../../../config';
import { to } from 'await-to-js';

export async function main(event) {
  const { keys: caseKeys, pdfStorageBucketKey } = event.detail;

  if (!caseKeys?.PK) {
    console.error('Missing attribute PK in event.detial.keys');
    return false;
  }

  if (!caseKeys?.SK) {
    console.error('Missing attribute SK in event.detial.keys');
    return false;
  }

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

  const [updateCasePdfAttributesError] = await to(
    updateCasePdfAttributes(caseKeys, pdfObject.Body)
  );
  if (updateCasePdfAttributesError) {
    console.error(updateCasePdfAttributesError);
    return false;
  }
}

async function updateCasePdfAttributes(caseKeys, pdf) {
  const UpdateExpression =
    'SET #pdf = :newPdf, #pdfGenerated = :newPdfGenerated, #state = :newState';
  const ExpressionAttributeNames = {
    '#pdf': 'pdf',
    '#pdfGenerated': 'pdfGenerated',
    '#state': 'state',
  };
  const ExpressionAttributeValues = {
    ':newPdf': pdf || undefined,
    ':newPdfGenerated': pdf !== undefined ? 'yes' : 'no',
    ':newState': pdf != undefined ? 'PDF_GENERATED' : 'PDF_NOT_GENERATED',
  };

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValue: 'NONE',
  };

  return dynamoDb.call('update', params);
}
