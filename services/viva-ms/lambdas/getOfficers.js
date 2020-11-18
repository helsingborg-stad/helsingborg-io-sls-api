import AWS from 'aws-sdk';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';

import { CASE_PROVIDER_VIVA } from '../../../libs/constants';
import * as request from '../../../libs/request';

const SSMParams = params.read(config.vada.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

/**
 * Handler reacting on event stream triggered by DynamoDB cases table
 * Fetches officeres information on an applicant via the Viva API adapter (VADA)
 * Sends the officers data into the eventbridge
 */
export const main = async event => {
  const [record] = event.Records;

  if (record.dynamodb.NewImage === undefined) {
    return null;
  }

  // Make DynamoDb data readable by the Viva API adapter (VADA)
  const unmarshalledData = dynamoDbConverter.unmarshall(record.dynamodb.NewImage);
};
