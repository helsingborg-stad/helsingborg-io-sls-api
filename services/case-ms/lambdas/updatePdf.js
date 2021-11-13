import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import S3 from '../../../libs/S3';
import { PDF_GENERATED, PDF_NOT_GENERATED } from '../../../libs/constants';

export async function main(event) {
  const { resourceId, pdfBucketKey } = event.detail;

  const [getFileS3Error, pdfS3Object] = await to(
    S3.getFile(process.env.PDF_STORAGE_BUCKET_NAME, pdfBucketKey)
  );
  if (getFileS3Error) {
    console.error(getFileS3Error);
    return false;
  }

  const [scanCasesByIdError, scanCasesResult] = await to(scanCasesById(resourceId));
  if (scanCasesByIdError) {
    console.error(scanCasesByIdError);
    return false;
  }

  const [currentCase] = scanCasesResult.Items;
  const [updateCaseAttributesError] = await to(updateCaseAttributes(currentCase, pdfS3Object.Body));
  if (updateCaseAttributesError) {
    console.error(updateCaseAttributesError);
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
  const newState = `${isPdf ? PDF_GENERATED : PDF_NOT_GENERATED}#${caseItem.state}`;

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
      PK: caseItem.PK,
      SK: caseItem.SK,
    },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValue: 'NONE',
  };

  return dynamoDb.call('update', params);
}
