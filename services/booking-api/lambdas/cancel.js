import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as response from '../../../libs/response';

import { getSsmParameters } from '../helpers/getSsmParameters';
import { sendBookingPostRequest } from '../helpers/sendBookingPostRequest';

export const main = async event => {
  const bookingId = event.pathParameters.id;

  const [error, ssmParameters] = await to(getSsmParameters());
  if (error) throwError(error.statusCode, error.message);

  const { outlookBookingEndpoint, apiKey } = ssmParameters;
  const url = `${outlookBookingEndpoint}/cancel`;
  const body = { bookingId };

  const [requestError] = await to(sendBookingPostRequest(url, apiKey, body));
  if (requestError) throwError(requestError.status, requestError.errorMessage);

  return response.success(200, body);
};
