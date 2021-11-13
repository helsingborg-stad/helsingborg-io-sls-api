import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import S3 from '../../../libs/S3';
import { PDF_GENERATED, PDF_NOT_GENERATED } from '../../../libs/constants';

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

  const [getFileS3Error, pdfS3Object] = await to(
    S3.getFile(process.env.PDF_STORAGE_BUCKET_NAME, pdfStorageBucketKey)
  );
  if (getFileS3Error) {
    console.error(getFileS3Error);
    return false;
  }

  const [updateCasePdfAttributesError] = await to(
    updateCasePdfAttributes(caseKeys, pdfS3Object.Body)
  );
  if (updateCasePdfAttributesError) {
    console.error(updateCasePdfAttributesError);
    return false;
  }

  return true;
}

function updateCasePdfAttributes(caseKeys, pdf) {
  const isPdf = !!pdf;
  const newState = isPdf ? PDF_GENERATED : PDF_NOT_GENERATED;

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
