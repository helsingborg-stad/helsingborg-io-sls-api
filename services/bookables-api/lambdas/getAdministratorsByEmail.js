import to from 'await-to-js';

import * as response from '../../../libs/response';

import searchAdministrators from '../helpers/searchAdministrators';
import { getBookables } from '../helpers/bookables';

export async function main(event) {
  const { email } = event.pathParameters;

  if (!email) {
    return response.failure({ status: 403, message: 'Missing required parameter "email"' });
  }

  const [getBookablesError, bookablesResponse] = await to(getBookables());
  if (getBookablesError) {
    return response.failure(getBookablesError);
  }

  const sharedEmail = bookablesResponse.find(({ sharedMailbox }) => sharedMailbox === email);
  if (sharedEmail === undefined) {
    return response.failure({ status: 404, message: 'Email does not exist' });
  }

  const [searchAdministratorsError, searchAdministratorsResult] = await to(
    searchAdministrators({ email })
  );

  if (searchAdministratorsError) {
    return response.failure(searchAdministratorsError);
  }

  const { data } = searchAdministratorsResult.data;
  return response.success(200, data);
}
