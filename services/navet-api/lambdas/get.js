import { success, failure } from '../../../libs/response';
import { to } from '../../../libs/helpers';
import { parseXml, parseJSONError, parseJSON } from '../helpers/parser';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import * as request from '../../../libs/request';
import { client } from '../helpers/client';
import params from '../../../libs/params';

const SSMParams = params.read('/navetEnvs/dev');

// get item (GET)
export const main = async event => {
  let err, navetResponse, parsedData;

  const { personalNumber } = event.pathParameters;
  const navetSSMparams = await SSMParams;
  navetSSMparams.personalNumber = personalNumber;
  const xml = parseXml(navetSSMparams);

  [err, navetResponse] = await to(requestNavetUser(xml, navetSSMparams));
  // TODO: HANDLE ERROR

  [err, parsedData] = await to(parseJSON(navetResponse.data));
  // TODO: HANDLE ERROR

  const userData = parsedData.Folkbokforingspost.Personpost;

  return success({
    type: 'user',
    attributes: userData,
  });
};

async function requestNavetUser(payload, params) {
  let err, navetClient, navetUser;

  [err, navetClient] = await to(client(params));

  if (!navetClient) throwError(503);

  [err, navetUser] = await to(
    request.call(navetClient, 'post', params.personpostXmlEndpoint, payload)
  );

  if (!navetUser) throwError(err.status);

  return navetUser;
}
