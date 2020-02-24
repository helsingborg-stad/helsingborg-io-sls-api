import { failure, success } from '../../libs/response';
import * as request from '../../libs/request';
import * as bankId from './helpers/bankId';

export const main = async (event) => {
  try {
    const { endUserIp, personalNumber } = JSON.parse(event.body);

    const payload = { endUserIp, personalNumber };

    const bankIdClient = await bankId.client();

    const data = await request.call(
      bankIdClient,
      'post',
      bankId.url('/auth'),
      payload
    );

    return success({ status: true, body: data });
  } catch (error) {
    return failure({ status: false });
  }
};
