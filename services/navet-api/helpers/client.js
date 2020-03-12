import { requestClient } from '../../../libs/request';
import * as certs from './certificates';

export const client = async params => {
  try {
    const navetCa = await certs.read(params.bucketName, 'KommunA.p12');

    const options = {
      pfx: navetCa.Body,
      passphrase: params.passphrase,
      rejectUnauthorized: false,
    };

    return requestClient(options, 5000, 'text/xml;charset=UTF-8');
  } catch (error) {
    return error;
  }
};
