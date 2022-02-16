// eslint-disable-next-line @typescript-eslint/no-var-requires
const throwError = require('@helsingborg-stad/npm-api-error-handling');
import to from 'await-to-js';

import params from '../libs/params';
import config from '../libs/config';

export interface Bookables {
  name: string;
  sharedMailbox: string;
  address: string;
  formId: string;
}

export interface SSMParams {
  bookables: Bookables[];
}

async function getBookables(): Promise<Bookables[]> {
  const { bookables } = await getSsmParameters();
  return bookables;
}

async function getSsmParameters(): Promise<SSMParams> {
  const [error, response] = await to(params.read(config.bookables.envsKeyName));
  if (error) {
    throwError(500);
  }
  return response as SSMParams;
}

export { getBookables };
