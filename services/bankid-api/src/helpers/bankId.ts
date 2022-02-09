/* eslint-disable no-useless-catch */
import { requestClient } from '../libs/request';
import * as certs from '../libs/certificates';
import { BankIdParams } from './types';

export const url = (baseUrl: string, path: string) => `${baseUrl}${path}`;

export const client = async (params: BankIdParams) => {
  const { bucketName, passphrase, caName, pfxName } = params;

  try {
    const bankIdCa = await certs.read(bucketName, caName);
    const bankIdPfx = await certs.read(bucketName, pfxName);

    const options = {
      ca: bankIdCa.Body,
      pfx: bankIdPfx.Body,
      passphrase,
      rejectUnauthorized: false,
    };

    return requestClient(options);
  } catch (error) {
    throw error;
  }
};
