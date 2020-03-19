/* eslint-disable no-console */
import * as response from '../../../libs/response';
import to from 'await-to-js';
import { parseXml, parseErrorMessageFromXML, parseJSON } from '../helpers/parser';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import * as request from '../../../libs/request';
import { client } from '../helpers/client';
import params from '../../../libs/params';

const SSMParams = params.read('/navetEnvs/dev');

export const main = async event => {
  const { personalNumber } = event.detail;
  const navetSSMparams = await SSMParams;
  navetSSMparams.personalNumber = personalNumber;
  const xml = parseXml(navetSSMparams);

  const [err, navetResponse] = await to(requestNavetUser(xml, navetSSMparams));
  if (err) return response.failure(err);

  return response.success({
    type: 'user',
    attributes: navetResponse,
  });
};

async function requestNavetUser(payload, params) {
  let err, navetClient, navetUser, parsedData;

  // Create HTTP client
  [err, navetClient] = await to(client(params));
  if (!navetClient) throwError(503);

  // Get user from Navet API
  [err, navetUser] = await to(
    request.call(navetClient, 'post', params.personpostXmlEndpoint, payload)
  );
  if (err) {
    // Parse Error Message from XML.
    const [, parsedErrorMessage] = await to(parseErrorMessageFromXML(err.response.data));
    throwError(err.response.status, parsedErrorMessage || null);
  }

  // Parse XML data to JSON
  [err, parsedData] = await to(parseJSON(navetUser.data));
  if (err) throwError(500);

  // Collect the user data from response
  const navetUserData = parsedData.Folkbokforingspost.Personpost;
  if (navetUserData === undefined) throwError(500);

  return navetUserData;
}
