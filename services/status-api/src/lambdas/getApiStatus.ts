import * as response from '../libs/response';

import log from '../libs/logs';

export async function getApiStatus() {
  const message = process.env.message || '';

  return response.success(200, { message });
}

export const main = log.wrap(() => {
  return getApiStatus();
});
