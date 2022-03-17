import { requestClient } from '../libs/request';
import * as certs from '../libs/certificates';
import { BankIdSSMParams } from './types';

export const url = (baseUrl: string, path: string) => `${baseUrl}${path}`;

export async function client(params: BankIdSSMParams) {
  const { bucketName, passphrase, caName, pfxName } = params;

  const bankIdCa = await certs.read(bucketName, caName);
  const bankIdPfx = await certs.read(bucketName, pfxName);

  const options = {
    ca: bankIdCa.Body,
    pfx: bankIdPfx.Body,
    passphrase,
    rejectUnauthorized: false,
  };

  return requestClient(options);
}
