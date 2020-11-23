/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';
import deepEqual from 'deep-equal';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import * as request from '../../../libs/request';
import * as dynamoDb from '../../../libs/dynamoDb';

const SSMParams = params.read(config.vada.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

/**
 * Handle case event (INSERT|MODIFY) to check
 * and update case administrator data in DynamoDB
 */
export const main = async event => {
  if (event.detail.dynamodb.NewImage === undefined) {
    return null;
  }

  // Convert DynamoDB case data to plain object
  const unMarshalledCaseData = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);

  const { details } = unMarshalledCaseData;
  if (!('administrators' in details)) {
    details['administrators'] = [];
  }
  const { administrators } = details;

  // Get Viva applicant officer(s)
  const [vadaMyPagesError, vadaMyPagesResponse] = await to(
    sendVadaMyPagesRequest(unMarshalledCaseData)
  );
  if (vadaMyPagesError) {
    return console.error('(Viva-ms) syncOfficers', vadaMyPagesError);
  }

  const { officer } = vadaMyPagesResponse;
  const vivaAdministrators = parseVivaOfficers(officer);

  if (deepEqual(vivaAdministrators, administrators)) {
    return null;
  }

  // Out of sync. Update
  const TableName = config.cases.tableName;
  const { PK, SK } = unMarshalledCaseData;

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
};

/**
 * Handler sending GET call to the Viva API adapter mypages endpoint
 *
 * @param {object} caseData
 * @return {object} Viva applicant officer(s)
 */
async function sendVadaMyPagesRequest(caseData) {
  const { PK } = caseData;
  const personalNumber = PK.substring(5);
  const ssmParams = await SSMParams;

  const { hashSalt, hashSaltLength } = ssmParams;
  const personalNumberEncoded = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const { vadaUrl, xApiKeyToken } = ssmParams;
  const requestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaMyPagesUrl = `${vadaUrl}/mypages/${personalNumberEncoded}`;

  const [error, vadaMyPagesResponse] = await to(
    request.call(requestClient, 'get', vadaMyPagesUrl, null)
  );

  if (error) {
    if (error.response) {
      // The request was made and the server responded with a
      // status code that falls out of the range of 2xx
      throwError(error.response.status, error.response.data.message);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of http.ClientRequest in node.js
      throwError(500, error.request.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      throwError(500, error.message);
    }
  }

  return vadaMyPagesResponse.data.person.cases.vivacases.vivacase.officers;
}

/**
 * Handler updateing data stored in DynamoDB
 *
 * @param {params} params
 */
async function sendUpdateRequest(params) {
  const [error, result] = await to(dynamoDb.call('update', params));
  if (error) {
    throwError(500, error.message);
  }

  return result;
}

/**
 * Parse and convert Viva officers to case administrators list
 *
 * @param {*} vivaOfficer object or array if applicant has many officers
 * @returns list of case administrator objects
 */
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
