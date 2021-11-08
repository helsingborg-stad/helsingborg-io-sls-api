import DynamoDB from 'aws-sdk/clients/dynamodb';
import to from 'await-to-js';
import handlebars from 'handlebars';

import config from '../../../config';

import log from '../../../libs/logs';
import params from '../../../libs/params';
import { s3Client } from '../../../libs/S3';

import createRecurringCaseTemplateData from '../helpers/createRecurringCaseTemplateData';
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

  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    log.error(
      'Read ssm params ´config.cases.providers.viva.envsKeyName´ failed',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-001',
      paramsReadError
    );
    return false;
  }

  const caseItem = DynamoDB.Converter.unmarshall(dynamodb.NewImage);

  const [s3GetObjectError, s3Object] = await to(
    s3Client
      .getObject({
        Bucket: process.env.PDF_STORAGE_BUCKET_NAME,
        Key: 'templates/ekb-recurring.hbs',
      })
      .promise()
  );
  if (s3GetObjectError) {
    log.error(
      'Failed to get object from S3 bucket',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-002',
      s3GetObjectError
    );
    return false;
  }

  const handlebarsTemplateFileBody = s3Object.Body.toString();
  const template = handlebars.compile(handlebarsTemplateFileBody);
  const caseTemplateData = createRecurringCaseTemplateData(
    caseItem,
    vivaCaseSSMParams.recurringFormId
  );
  const html = template(caseTemplateData);

  const caseHtmlKey = `html/case-${caseItem.id}.html`;
  const [s3PutObjectError] = await to(
    s3Client
      .putObject({
        Bucket: process.env.PDF_STORAGE_BUCKET_NAME,
        Key: caseHtmlKey,
        Body: html,
      })
      .promise()
  );
  if (s3PutObjectError) {
    log.error(
      'Failed to put object to S3 bucket',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-003',
      s3GetObjectError
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
      'service-viva-ms-generateRecurringCaseHtml-004',
      putEventError
    );
    return false;
  }

  return true;
}
