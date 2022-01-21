import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
  const { email } = event.pathParameters;

  if (!email) {
    return response.failure({
      status: 400,
      message: 'Missing required parameter: "email"',
    });
  }

  const emailRegex = /.*@.*\..*/;
  const emailIsValid = emailRegex.test(email);

  if (!emailIsValid) {
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

  const { data } = getAdministratorDetailsResponse.data;
  return response.success(200, data);
}
