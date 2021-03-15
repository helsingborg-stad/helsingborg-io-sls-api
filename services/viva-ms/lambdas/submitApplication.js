/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import { putEvent } from '../../../libs/awsEventBridge';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const VADA_SSM_PARAMS = params.read(config.vada.envsKeyName);
const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

export async function main(event) {
  if (event.detail.dynamodb.NewImage === undefined) {
    return undefined;
  }

  const caseItem = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);

  const vivaCaseSSMParams = await VIVA_CASE_SSM_PARAMS;
  if (vivaCaseSSMParams.recurringFormId !== caseItem.currentFormId) {
    console.info('(Viva-ms): currentFormId does not match recurringFormId');
    return true;
  }

  const vadaSSMParams = await VADA_SSM_PARAMS;
  const { hashSalt, hashSaltLength } = vadaSSMParams;
  const personalNumber = caseItem.PK.substring(5);
  const personalNumberHashEncoded = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const {
    forms: {
      [caseItem.currentFormId]: { answers },
    },
    details: { workflowId },
    pdf: pdfBinaryBuffer,
  } = caseItem;

  const [applicationPostError, applicationResponse] = await to(
    vivaAdapter.application.post({
      applicationType: 'recurrent',
      hashid: personalNumberHashEncoded,
      workflowId,
      answers,
      rawData: pdfBinaryBuffer.toString(),
      rawDataType: 'pdf',
    })
  );
  if (applicationPostError) {
    return console.error('(Viva-ms)', applicationPostError);
  }
  console.info('(Viva-ms)', applicationResponse);

  const caseKeys = {
    PK: caseItem.PK,
    SK: caseItem.SK,
  };

  const [putEventError] = await to(
    putEvent(
      {
        personalNumberHashEncoded,
        caseKeys,
      },
      'vivaMsSubmitApplicationSuccess',
      'vivaMs.submitApplication'
    )
  );
  if (putEventError) {
    throw putEventError;
  }
}
