import { failure, success } from '../../libs/response';
import * as request from '../../libs/request';
import * as bankId from './helpers/bankId';

export const main = async (event) => {
  try {
    const { orderRef } = JSON.parse(event.body);

    const payload = { orderRef };

    const bankIdClient = await bankId.client();

    const { data } = await request.call(
      bankIdClient,
      'post',
      bankId.url('/cancel'),
      payload,
    );

    return success({ status: true, body: data });
  } catch (error) {
    return failure({ status: false });
  }
};
