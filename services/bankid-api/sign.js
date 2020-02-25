import { failure, success } from '../../libs/response';
import * as request from '../../libs/request';
import * as bankId from './helpers/bankId';

export const main = async (event) => {
  try {
    const { endUserIp, personalNumber, userVisibleData } = JSON.parse(event.body);

    const payload = {
      endUserIp,
      personalNumber,
      userVisibleData: userVisibleData
        ? Buffer.from(userVisibleData).toString('base64')
        : undefined,
    };

    const bankIdClient = await bankId.client();

    const data = request.call(
      bankIdClient,
      'post',
      bankId.url('/sign'),
      payload,
    );

    return success({ status: true, body: data });
  } catch (error) {
    return failure({ status: false, error });
  }
};
