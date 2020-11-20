/* eslint-disable no-console */
import AWS from 'aws-sdk';
// import to from 'await-to-js';
// import { throwError } from '@helsingborg-stad/npm-api-error-handling';

// import config from '../../../config';
// import params from '../../../libs/params';

// import { CASE_PROVIDER_VIVA } from '../../../libs/constants';

// const SSMParams = params.read(config.vada.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

export const main = async event => {
  // Make DynamoDb data readable by the Viva API adapter
  const unmarshalledData = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);

  console.log('unmarshalledData', unmarshalledData);

  return 'OK';
};

// async function sendRequest() {
//   return {};
// }
