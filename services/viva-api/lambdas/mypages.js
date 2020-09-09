/* eslint-disable no-console */
import to from 'await-to-js';
import Hashids from 'hashids';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

// import config from '../../../config';
import * as request from '../../../libs/request';
import * as response from '../../../libs/response';
// import { decodeToken } from '../../../libs/token';

/**
 * Get user info (mypages) from viva api
 */

export const main = async event => {
  /**
   * TODO:
   * Put salt in env config of some sort.
   * Salt must match salt stored in env used by adapter api
   */
  const hashids = new Hashids(
    '6Ujh)XSDB+.39DO`/R|/wWa>64*k=T3>?Xn-*$1:g T&Vv`|X 5<!CzC,YaM&e#U',
    32
  );

  const hashid = hashids.encode('199412015852'); // Kalle Testarsson

  const [err, vadaMypagesResponse] = await to(sendVadaMypagesRequest(hashid));
  if (err) return response.failure(err);

  return response.buildResponse(200, {
    type: 'vivaGet',
    ...vadaMypagesResponse.data,
  });
};

async function sendVadaMypagesRequest(hashid) {
  const vadaClient = request.requestClient({});

  /**
   * TODO:
   * Put url in env config of some sort
   * 
   * / 
  const [err, vadaMypages] = await to(
    request.call(vadaClient, 'get', `https://viva-adapter.helsingborg.io/viva/mypages/${hashid}`)
  );

  if (err) throwError(err.status);

  return vadaMypages;
}
