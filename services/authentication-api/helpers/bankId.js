import { requestClient } from '../../../libs/request';

const { bankIdUrl, bankIdCa, bankdIdPassphrase, bankIdPfxBase64 } = process.env;

export const url = path => `${bankIdUrl}${path}`;

export const client = () => {
  const clientOptions = {
    ca: bankIdCa,
    pfx: bankIdPfxBase64,
    passphrase: bankdIdPassphrase,
    rejectUnauthorized: false
  };
  console.log(requestClient(clientOptions));
  return requestClient(clientOptions);
};
