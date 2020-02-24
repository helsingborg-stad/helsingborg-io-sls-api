import { to } from '../../libs/helpers';
import { failure, success } from '../../libs/response';
import * as request from '../../libs/request';
import * as bankId from './helpers/bankId';

export const main = async (event) => {

  const { endUserIp, personalNumber } = event.body;

  const payload = { endUserIp, personalNumber };

  const { ok, result } =  await to(request.call(
    bankId.client(),
    'post',
    bankId.url('/auth'),
    payload
  ));

  if (!ok ) {
    failure({status: false, error: result});
  };

  return success({status: true, body: result});
};
