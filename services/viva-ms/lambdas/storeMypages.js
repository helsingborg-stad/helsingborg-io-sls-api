/* eslint-disable no-console */
import to from 'await-to-js';
import Hashids from 'hashids';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

// import config from '../../../config';
import * as request from '../../../libs/request';
// import * as response from '../../../libs/response';

/**
 * TODO:
 * Put salt in env config of some sort
 * Salt must match salt stored in env used by viva api adapter
 */
const hashids = new Hashids('6Ujh)XSDB+.39DO`/R|/wWa>64*k=T3>?Xn-*$1:g T&Vv`|X 5<!CzC,YaM&e#U', 32);

/**
 * Handler function for reacting on some event
 */
export const main = async event => {
  console.log('LogScheduledEvent');
  console.log('Received event:', JSON.stringify(event, null, 2));

  const [err, vadaMypagesResponseData] = await to(requestVadaMypages(event.pNumber));
  if (err) {
    return console.error('Lambda: mypagesOnEvent', err);
  }

  console.log('Vada Mypages response', vadaMypagesResponseData);

  return true;
};

async function requestVadaMypages(personalNumber) {
  const hashId = hashids.encode(personalNumber);

  /**
   * TODO:
   * Put Viva api adapter url in env config of some sort
   */
  const [err, vadaResponse] = await to(
    request.call(
      request.requestClient({}),
      'get',
      `https://viva-adapter.helsingborg.io/viva/mypages/${hashId}`
    )
  );
  if (err) {
    throwError(500, err);
  }

  return vadaResponse.data;
}
