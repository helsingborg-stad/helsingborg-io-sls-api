/* eslint-disable no-useless-catch */
import { requestClient } from '../../../libs/request';
import * as certs from './certificates';

export const url = (baseUrl, path) => `${baseUrl}${path}`;

export const client = async params => {
  try {
    const bankIdCa = await certs.read(params.bucketName, 'bankid.ca');
    const bankIdPfx = await certs.read(params.bucketName, 'FPTestcert2.pfx');

    const options = {
      ca: bankIdCa.Body,
      pfx: bankIdPfx.Body,
      passphrase: params.passphrase,
      rejectUnauthorized: false,
    };

    return requestClient(options);
  } catch (error) {
    throw error;
  }
};
