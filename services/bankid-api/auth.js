import { failure, success } from '../../libs/response';
import { to } from '../../libs/helpers';
import * as request from '../../libs/request';
import * as bankId from './helpers/bankId';

export const main = async event => {
  const { endUserIp, personalNumber } = JSON.parse(event.body);

  const payload = {
    endUserIp,
    personalNumber,
  };

  const [bankIdOk, bankIdClient] = await to(bankId.client());

  if (!bankIdOk) {
    return failure({ status: false, error: bankIdClient });
  }

  const [dataOk, { data }] = await to(
    request.call(bankIdClient, 'post', bankId.url('/auth'), payload),
  );

  if (!dataOk) {
    return failure({ status: false });
  }

  return success({ status: true, body: data });
};
