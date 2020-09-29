/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';
import Hashids from 'hashids';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

// import config from '../../../config';
import { VIVA_CASE_TYPE, CASE_STATUS_SUBMIT } from '../../../libs/constants';
import * as request from '../../../libs/request';
// import * as response from '../../../libs/response';

const dynamoDbConverter = AWS.DynamoDB.Converter;

/**
 * TODO:
 * Put salt in env config of some sort
 * Salt must match salt stored in env used by viva api adapter
 */
const hashids = new Hashids('6Ujh)XSDB+.39DO`/R|/wWa>64*k=T3>?Xn-*$1:g T&Vv`|X 5<!CzC,YaM&e#U', 32);

/**
 * Handler function for reacting to a stream from the cases table
 */
export const main = async event => {
  const [record] = event.Records;
  // console.log('record', record);

  if (record.dynamodb.NewImage === undefined) return null;

  // Viva is not keen on the DynamoDb data structure
  const unmarshalledData = dynamoDbConverter.unmarshall(record.dynamodb.NewImage);
  // console.log('unmarshalledData', unmarshalledData);

  // Send to Viva only if case is of the correct type
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

async function sendVadaRequest(caseData) {
  const { data: applicationBody, personalNumber, period } = caseData;

  // Build Viva api adapter payload
  const vadaPayload = {
    applicationType: 'recurrent', // basic | recurrent
    personalNumber: hashids.encode(personalNumber),
    workflowId: '',
    clientIp: '0.0.0.0',
    period,
    applicationBody,
  };

  /**
   * TODO:
   * Put Viva api adapter url in env config of some sort
   */
  const [error, vadaCreateRecurrentApplicationResponse] = await to(
    request.call(
      request.requestClient({}),
      'post',
      'https://viva-adapter.helsingborg.io/applications',
      vadaPayload
    )
  );

  if (error) {
    throwError(500, error);
  }

  return vadaCreateRecurrentApplicationResponse;
}
