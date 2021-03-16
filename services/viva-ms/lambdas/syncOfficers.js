/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';
import deepEqual from 'deep-equal';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const dynamoDbConverter = AWS.DynamoDB.Converter;

export async function main(event) {
  if (event.detail.dynamodb.NewImage === undefined) {
    return null;
  }

  const unMarshalledCaseData = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);

  const { PK, SK, details } = unMarshalledCaseData;
  if (!('administrators' in details)) {
    details['administrators'] = [];
  }
  const { administrators } = details;

  const personalNumber = PK.substring(5);
  const [vadaMyPagesError, vadaMyPagesResponse] = await to(
    vivaAdapter.officers.get(personalNumber)
  );
  if (vadaMyPagesError) {
    return console.error('(Viva-ms) syncOfficers', vadaMyPagesError);
  }

  const { officer } = vadaMyPagesResponse;
  const vivaAdministrators = parseVivaOfficers(officer);

  if (deepEqual(vivaAdministrators, administrators)) {
    return null;
  }

  const TableName = config.cases.tableName;

  const UpdateExpression = 'SET details.administrators = :newAdministrators';
  const ExpressionAttributeValues = { ':newAdministrators': vivaAdministrators };

  const dynamoDbParams = {
    TableName,
    Key: {
      PK,
      SK,
    },
    UpdateExpression,
    ExpressionAttributeValues,
    ReturnValues: 'UPDATED_NEW',
  };

  const [updateError] = await to(sendUpdateRequest(dynamoDbParams));
  if (updateError) {
    return console.error('(Viva-ms) syncOfficers', updateError);
  }

  return true;
}

async function sendUpdateRequest(params) {
  const [error, result] = await to(dynamoDb.call('update', params));
  if (error) {
    throwError(500, error.message);
  }

  return result;
}

function parseVivaOfficers(vivaOfficer) {
  let vivaOfficers = [];

  if (Array.isArray(vivaOfficer)) {
    vivaOfficers = [...vivaOfficer];
  } else {
    // vivaOfficer is an object when viva applicant has only one officer
    vivaOfficers.push(vivaOfficer);
  }

  const vivaAdministrators = vivaOfficers.map(officer => {
    const { name: complexName, title, mail: email, phone } = officer;
    const name = complexName.replace(/^CN=(.+)\/OU.*$/, `$1`);

    return {
      name,
      title,
      email,
      phone,
    };
  });

  return vivaAdministrators;
}
