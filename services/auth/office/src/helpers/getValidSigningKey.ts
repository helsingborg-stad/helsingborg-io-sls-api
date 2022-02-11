import certToPEM from './certToPEM';

import { JWK } from '../constants';

/**
 * For more information regarding JWKS properties see:
 * https://auth0.com/docs/security/tokens/json-web-tokens/json-web-key-set-properties
 */

export interface SigningKey {
  use: string;
  kty: string;
  kid: string;
  x5c: string[];
  x5t?: string;
  n: string;
  e: string;
  issuer: string;
}
export default function getValidSigningKey({ use, kty, kid, x5c = [], n, e }: SigningKey) {
  const isValidSigningKey =
    use === JWK.USE && kty === JWK.KTY && kid && (x5c.length > 0 || (n && e));

  if (isValidSigningKey) {
    const publicKey = certToPEM(x5c[0]);
    return { kid, publicKey };
  }

  return undefined;
}
