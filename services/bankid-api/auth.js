import { failure, success } from '../../libs/response';
import { to } from '../../libs/helpers';
import * as request from '../../libs/request';
import * as bankId from './helpers/bankId';

export const main = async event => {
  const payload = {
    endUserIp: '127.0.0.1',
    personalNumber: '195611260629',
  };

  const [bOk, bankIdClient] = await to(bankId.client());

  if (!bOk) {
    return failure({ status: false, error: bankIdClient });
  }

  const [rOk, data] = await to(
    request.call(bankIdClient, 'post', bankId.url('/auth'), payload),
  );

  if (!rOk) {
    return failure({ status: false, error: data });
  }

  return success({ status: true, body: data });
};
