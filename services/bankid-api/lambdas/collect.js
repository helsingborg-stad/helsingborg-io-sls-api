import { failure, success } from '../../../libs/response';
import params from "../../../libs/params";
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';

const SSMParams = params.read("/bankidEnvs/dev");

export const main = async event => {
  const bankidSSMParams = await SSMParams;
  try {
    const { orderRef } = JSON.parse(event.body);

    const payload = { orderRef };

    const bankIdClient = await bankId.client(bankidSSMParams);

    const { data } = await request.call(
      bankIdClient,
      'post',
      bankId.url(bankidSSMParams.apiUrl, '/collect'),
      payload,
    );

    const { status, hintCode } = data;

    return success({
      type: 'bankIdCollect',
      attributes: {
        order_ref: orderRef,
        status,
        hint_code: hintCode,
      },
    });
  } catch (error) {
    return failure({ status: false, error: error.message });
  }
};
