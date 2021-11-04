import certToPEM from './certToPEM';

import { JWK } from '../constants';

export default function getValidSigningKeys(publicKeys) {
  const keys = [];

  publicKeys.forEach(({ use, kty, kid, x5c = [], n, e }) => {
    const isValidSigningKey =
      use === JWK.USE && kty === JWK.KTY && kid && (x5c.length > 0 || (n && e));

    if (isValidSigningKey) {
      const publicKey = certToPEM(x5c[0]);
      keys.push({ kid, publicKey });
    }
  });

  return keys;
}
