import { requestClient } from '../../../libs/request';
import * as certs from './certificates';

const {
  // BANKID_API_URL,
  BANKID_PASSPHRASE,
} = process.env;

// export const url = path => `${BANKID_API_URL}${path}`;

export const client = async () => {
  try {
    const bankIdCa = await certs.read(`helsingborg-io-sls-certificates-dev`, 'bankd.crt');
    const bankIdPfx = await certs.read(`helsingborg-io-sls-certificates-dev`, 'FPTestcert2.pfx');

    const clientOptions = {
      ca: bankIdCa.Body,
      pfx: bankIdPfx.Body,
      passphrase: BANKID_PASSPHRASE,
      rejectUnauthorized: false
    };
    return requestClient(clientOptions);
  } catch (error) {
    console.log(error);
  }
};
