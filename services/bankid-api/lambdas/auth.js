import { failure, success } from '../../../libs/response';
import { to } from '../../../libs/helpers';
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';
import { getConfig } from '../helpers/ssmParameters';

const SSMParams = getConfig('/bankidEnvs/dev');

export const main = async event => {
  const bankidSSMparams = await SSMParams;

  const { endUserIp, personalNumber } = JSON.parse(event.body);

  const payload = {
    endUserIp,
    personalNumber,
  };

  const [bankIdOk, bankIdClient] = await to(bankId.client(bankidSSMparams));

  if (!bankIdOk) {
    return failure({ status: false, error: bankIdClient });
  }

  const [dataOk, response] = await to(
    request.call(
      bankIdClient,
      'post',
      bankId.url(bankidSSMparams.apiUrl, '/auth'),
      payload,
    ),
  );

  if (!dataOk) {
    return failure({ status: false, error: response });
  }

  return success({ status: true, body: response.data });
};
