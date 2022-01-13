import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
  const { email } = event.pathParameters;

  const [error, getAdministratorDetailsResponse] = await to(
    booking.getAdministratorDetails({ email })
  );
  if (error) {
    return response.failure(error);
  }

  const { data } = getAdministratorDetailsResponse.data;
  return response.success(200, data);
}
