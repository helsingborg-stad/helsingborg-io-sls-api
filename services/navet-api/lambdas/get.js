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
  const { personalNumber } = event.pathParameters;
  const navetSSMparams = await SSMParams;
  navetSSMparams.personalNumber = personalNumber;
  const xml = parseXml(navetSSMparams);

  const [error, navetResponse] = await to(requestNavetUser(xml, navetSSMparams));

  const data = await parseJSON(navetResponse.data);
  console.log('parseJSON', data);
  //const res = data.Folkbokforingspost;

  return success({
    type: 'user',
    attributes: data,
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
