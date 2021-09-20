import to from 'await-to-js';

import params from '../../../libs/params';
import config from '../../../config';

let bookingSsmParameters;

export async function getSsmParameters() {
  if (!bookingSsmParameters) {
    const [error, result] = await to(params.read(config.booking.envsKeyName));

    if (error) throw error;

    bookingSsmParameters = result;
  }

  return bookingSsmParameters;
}
