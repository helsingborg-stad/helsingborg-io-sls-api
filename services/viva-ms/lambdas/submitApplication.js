/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';
import Hashids from 'hashids';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import { VIVA_CASE_TYPE, CASE_STATUS_SUBMIT } from '../../../libs/constants';
import * as request from '../../../libs/request';

const SSMParams = params.read(config.vada.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

/**
 * Handler reacting on event stream triggered by DynamoDB cases table
 */
export const main = async event => {
  const [record] = event.Records;

  if (record.dynamodb.NewImage === undefined) return null;

  // Make DynamoDb data readable by the Viva API adapter
  const unmarshalledData = dynamoDbConverter.unmarshall(record.dynamodb.NewImage);

  const isVivaCase = unmarshalledData.type === VIVA_CASE_TYPE;
  const isCaseSubmitted = unmarshalledData.status === CASE_STATUS_SUBMIT;
  if (!isVivaCase || !isCaseSubmitted) return null;

  const [error, vadaResponse] = await to(sendVadaRequest(unmarshalledData));
  if (error) {
    return console.error('Viva-ms', error);
  }

  console.log('Viva-ms: VADA api response', vadaResponse.data);

  return true;
};

/**
 * Handler responsible for sending a POST call to Viva API adapter,
 * which in turn creates a case in Viva
 */
async function sendVadaRequest(caseData) {
  const { data: applicationBody, personalNumber } = caseData;

  const { hashSalt, hashSaltLength, vadaUrl } = await SSMParams;
  const hashids = new Hashids(hashSalt, hashSaltLength);

  // Construct imperative Viva API adapter payload
  const vadaPayload = {
    applicationType: 'recurrent', // basic | recurrent
    personalNumber: hashids.encode(personalNumber),
    workflowId: '',
    clientIp: '0.0.0.0',
    // TODO:
    // period parameter needs to be sent from the app to complete the application request
    period: {
      startDate: '2020-10-01',
      endDate: '2020-10-31',
    },
    applicationBody,
  };

  const [error, vadaCreateRecurrentApplicationResponse] = await to(
    request.call(request.requestClient({}), 'post', `${vadaUrl}/applications`, vadaPayload)
  );
  if (error) {
    throwError(500, error);
  }

  return vadaCreateRecurrentApplicationResponse;
}
