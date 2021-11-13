import DynamoDB from 'aws-sdk/clients/dynamodb';
import to from 'await-to-js';
import handlebars from 'handlebars';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';
import params from '../../../libs/params';
import S3 from '../../../libs/S3';
import { CASE_HTML_GENERATED } from '../../../libs/constants';

import createRecurringCaseTemplate from '../helpers/createRecurringCaseTemplate';
import putVivaMsEvent from '../helpers/putVivaMsEvent';

handlebars.registerHelper({
  eq: (v1, v2) => v1 === v2,
  ne: (v1, v2) => v1 !== v2,
  lt: (v1, v2) => v1 < v2,
  gt: (v1, v2) => v1 > v2,
  lte: (v1, v2) => v1 <= v2,
  gte: (v1, v2) => v1 >= v2,
  includes: (v1, v2) => v1.includes(v2),
  and() {
    return Array.prototype.every.call(arguments, Boolean);
  },
  or() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  },
});

export async function main(event, context) {
  const { dynamodb } = event.detail;
  if (dynamodb.NewImage === undefined) {
    return false;
  }

  const caseItem = DynamoDB.Converter.unmarshall(dynamodb.NewImage);

  const [s3GetObjectError, hbsTemplateS3Object] = await to(
    S3.getFile(process.env.PDF_STORAGE_BUCKET_NAME, 'templates/ekb-recurring.hbs')
  );
  if (s3GetObjectError) {
    log.error(
      'Failed to get object from S3 bucket',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-001',
      s3GetObjectError
    );
    return false;
  }

  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    log.error(
      'Read ssm params ´config.cases.providers.viva.envsKeyName´ failed',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-002',
      paramsReadError
    );
    return false;
  }

  const handlebarsTemplateFileBody = hbsTemplateS3Object.Body.toString();
  const template = handlebars.compile(handlebarsTemplateFileBody);
  const caseTemplateData = createRecurringCaseTemplate(caseItem, vivaCaseSSMParams.recurringFormId);
  const html = template(caseTemplateData);

  const caseHtmlKey = `html/case-${caseItem.id}.html`;
  const [s3StoreFileError] = await to(
    S3.storeFile(process.env.PDF_STORAGE_BUCKET_NAME, caseHtmlKey, html)
  );
  if (s3StoreFileError) {
    log.error(
      'Failed to put object to S3 bucket',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-003',
      s3StoreFileError
    );
    return false;
  }

  const [updateCaseError] = await to(updateVivaCaseState(caseItem));
  if (updateCaseError) {
    log.error(
      'Failed to update case state attribute',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-004',
      updateCaseError
    );
    return false;
  }

  const [putEventError] = await to(
    putVivaMsEvent.htmlGeneratedSuccess({
      pdfStorageBucketKey: caseHtmlKey,
      resourceId: caseItem.id,
    })
  );
  if (putEventError) {
    log.error(
      'Put event ´htmlGeneratedSuccess´ failed',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-005',
      putEventError
    );
    return false;
  }

  return true;
}

function updateVivaCaseState(caseItem) {
  const newState = `${CASE_HTML_GENERATED}#${caseItem.state}`;
  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseItem.PK,
      SK: caseItem.SK,
    },
    UpdateExpression: 'SET #state = :newState',
    ExpressionAttributeNames: {
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newState': newState,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', params);
}
