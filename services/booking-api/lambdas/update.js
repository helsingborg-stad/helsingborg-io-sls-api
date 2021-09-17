import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as response from '../../../libs/response';

import getSsmParameters from '../helpers/getSsmParameters';
import makeBookingRequest from '../helpers/makeBookingRequest';

export const main = async event => {
  const bookingId = event.pathParameters.id;

  const [error, ssmParameters = {}] = await to(getSsmParameters());
  if (error) throwError(error.status, error.errorMessage);

  const { outlookBookingEndpoint, apiKey } = ssmParameters;
  let url = `${outlookBookingEndpoint}/cancel`;
  let body = { bookingId };

  const [cancelRequestError] = await to(makeBookingRequest(url, apiKey, body));
  if (cancelRequestError) throwError(cancelRequestError.status, cancelRequestError.errorMessage);

  url = `${outlookBookingEndpoint}/create`;
  body = { ...JSON.parse(event.body) };

  const [createRequestError, createBookingResponse = {}] = await to(
    makeBookingRequest(url, apiKey, body)
  );
  if (createRequestError) throwError(createRequestError.status, createRequestError.errorMessage);

  const { data } = createBookingResponse.data;
  return response.success(200, data);
};
