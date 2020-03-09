import { failure, success } from '../../../libs/response';
import params from '../../../libs/params';
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';

const SSMParams = params.read('/bankidEnvs/dev');

export const main = async event => {
  try {
    const bankidSSMParams = await SSMParams;
    const { endUserIp, personalNumber, userVisibleData } = JSON.parse(
      event.body,
    );

    const payload = {
      endUserIp,
      personalNumber,
      userVisibleData: userVisibleData
        ? Buffer.from(userVisibleData).toString('base64')
        : undefined,
    };

    const bankIdClient = await bankId.client(bankidSSMParams);

    const { data } = await request.call(
      bankIdClient,
      'post',
      bankId.url(bankidSSMParams.apiUrl, '/sign'),
      payload,
    );

    const { orderRef, autoStartToken } = data;

    return success({
      type: 'bankIdSign',
      attributes: {
        order_ref: orderRef,
        auto_start_token: autoStartToken,
      },
    });
  } catch (error) {
    return failure({ status: false, error: error.message });
  }
};
