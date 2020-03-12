import { requestClient } from '../../../libs/request';
import * as certs from './certificates';

export const client = async params => {
  try {
    const navetCa = await certs.read(params.bucketName, 'KommunA.p12');

    const options = {
      rejectUnauthorized: false,
      pfx: navetCa.Body,
      passphrase: params.passphrase,
    };

    return requestClient(options, 5000, 'text/xml;charset=UTF-8');
  } catch (error) {
    return error;
  }
};
