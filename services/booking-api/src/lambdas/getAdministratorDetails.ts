import to from 'await-to-js';

import booking from '../helpers/booking';

import * as response from '../libs/response';
import log from '../libs/logs';

export async function main(
  event: {
    pathParameters: { email: string };
  },
  context: { awsRequestId: string }
) {
  const { email } = event.pathParameters;

  if (!email) {
    log.error(
      'Missing path parameter',
      context.awsRequestId,
      'service-booking-api-getAdministratorDetails-001'
    );
    return response.failure({
      status: 400,
      message: 'Missing required parameter: "email"',
    });
  }

  const emailRegex = /.+@.+\..+/;
  const emailIsValid = emailRegex.test(email);

  if (!emailIsValid) {
    log.error(
      'Path parameter is not a valid email',
      context.awsRequestId,
      'service-booking-api-getAdministratorDetails-002'
    );
    return response.failure({
      status: 400,
      message: 'Malformed email',
    });
  }

  const [error, getAdministratorDetailsResponse] = await to(
    booking.getAdministratorDetails({ email })
  );
  if (error) {
    return response.failure(error);
  }

  const { data } = getAdministratorDetailsResponse?.data ?? {};
  return response.success(200, data);
}
