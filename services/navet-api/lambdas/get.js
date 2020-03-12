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

  // // const response = await navet.post(NAVET_ENDPOINT, xml);
  console.log('navetSSMparams', navetSSMparams);

  const xml = parseXml(navetSSMparams);
  console.log('xml', xml);

  const [error, navetResponse] = await to(requestNavetUser(xml, navetSSMparams));

  console.log('error', error);
  console.log('navetResponse', navetResponse);

  return success({
    type: 'user',
    attributes: {
      personal_number: personalNumber,
    },
  });
};

async function requestNavetUser(payload, params) {
  let err, navetClient, navetUser;

  [err, navetClient] = await to(client(params));
  if (err) throwError(503);

  [err, navetUser] = await to(
    request.call(navetClient, 'post', params.personpostXmlEndpoint, payload)
  );

  if (!navetUser) throwError(err.status);

  return navetUser;
}
