import AWS from 'aws-sdk';
import config from '../../../config';
import params from '../../../libs/params';
import to from 'await-to-js';
import handlebars from 'handlebars';
import { s3Client } from '../../../libs/S3';
import { putEvent } from '../../../libs/awsEventBridge';
import createRecurringCaseTemplateData from '../helpers/createCaseTemplateData';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

export async function main(event) {
  const { dynamodb } = event.detail;
  if (dynamodb.NewImage === undefined) {
    return false;
  }
  const vivaCaseSsmParams = await VIVA_CASE_SSM_PARAMS;
  const caseItem = AWS.DynamoDB.Converter.unmarshall(dynamodb.NewImage);

  const [s3GetObjectError, s3Object] = await to(
    s3Client
      .getObject({
        Bucket: process.env.PDF_STORAGE_BUCKET_NAME,
        Key: 'templates/ekb-recurring.hbs',
      })
      .promise()
  );
  if (s3GetObjectError) {
    console.error(s3GetObjectError);
    return false;
  }

  const handlebarsTemplateFileBody = s3Object.Body.toString();
  const template = handlebars.compile(handlebarsTemplateFileBody);
  const caseTemplateData = createRecurringCaseTemplateData(
    caseItem,
    vivaCaseSsmParams.recurringFormId
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
    console.error(s3PutObjectError);
    return false;
  }

  const [putEventError] = await to(
    putEvent(
      { pdfStorageBucketKey: caseHtmlKey, resourceId: caseItem.id },
      'htmlGeneratedSuccess',
      'vivaMs.generateCaseHtml'
    )
  );
  if (putEventError) {
    throw putEventError;
  }
}
