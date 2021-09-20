import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as response from '../../../libs/response';

import { getSsmParameters } from '../helpers/getSsmParameters';
import { sendBookingPostRequest } from '../helpers/sendBookingPostRequest';

export const main = async event => {
  const [error, ssmParameters] = await to(getSsmParameters());
  if (error) throwError(error.statusCode, error.message);

  const { outlookBookingEndpoint, apiKey } = ssmParameters;
  const url = `${outlookBookingEndpoint}/create`;
  const body = { ...JSON.parse(event.body) };

  const [requestError, createBookingResponse] = await to(sendBookingPostRequest(url, apiKey, body));
  if (requestError) throwError(requestError.status, requestError.errorMessage);

  const { data } = createBookingResponse.data;
  return response.success(200, data);
};
