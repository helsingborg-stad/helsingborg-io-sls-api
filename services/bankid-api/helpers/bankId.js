import { requestClient } from '../../../libs/request';
import fs from "fs";

const {
  BANKID_API_URL,
  BANKID_PASSPHRASE,
  BANKID_CA_PATH,
  BANKID_PFX_BASE64_PATH
} = process.env;

export const url = path => `${BANKID_API_URL}${path}`;

export const client = () => {

  const bankIdCa = fs.readFileSync(BANKID_CA_PATH);
  const bankIdPfx = fs.readFileSync(BANKID_PFX_BASE64_PATH);

  const clientOptions = {
    ca: bankIdCa,
    pfx: bankIdPfx,
    passphrase: BANKID_PASSPHRASE,
    rejectUnauthorized: false
  };
  return requestClient(clientOptions);
};
