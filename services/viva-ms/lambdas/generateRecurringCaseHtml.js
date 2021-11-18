import to from 'await-to-js';
import handlebars from 'handlebars';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';
import { getItem as getStoredUserCase } from '../../../libs/queries';
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
  const { caseKeys } = event.detail;

  const [getCaseItemError, caseItem] = await getStoredUserCase(
    config.cases.tableName,
    caseKeys.PK,
    caseKeys.SK
  );
  if (getCaseItemError) {
    log.error(
      'Error getting stored case from the cases table',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-000',
      getCaseItemError
    );
    return false;
  }

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
      keys: {
        PK: caseItem.PK,
        SK: caseItem.SK,
      },
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
  const updateParams = {
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
      ':newState': CASE_HTML_GENERATED,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}
