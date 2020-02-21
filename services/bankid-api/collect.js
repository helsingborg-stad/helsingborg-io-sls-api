import { to } from '../../libs/helpers';
import { failure, success } from '../../libs/response';
import * as request from '../../libs/request';
import * as bankId from './helpers/bankId';

export const main = async (event) => {

  const { orderRef } = JSON.parse(event.body);

  const payload = { orderRef };

  const { ok, result } = await to(
    request.call(bankId.client(), "post", bankId.url("/collect"), payload)
  );

  if ( !ok ) {
    return failure({status: false, error: result.response.data});
  }

  return success({status: true, body: result.data});
};
