import to from 'await-to-js';

import * as response from '../libs/response';

import { getBookables } from '../helpers/bookables';

export async function main() {
  const [ssmError, bookables] = await to(getBookables());
  if (ssmError) {
    return response.failure(ssmError);
  }

  return response.success(200, bookables);
}
