import to from 'await-to-js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

import generateIAMPolicy from '../../../../libs/generateIAMPolicy';

import getjwksUrl from '../helpers/getjwksUrl';
import getValidSigningKeys from '../helpers/getValidSigningKeys';

import { JWT } from '../constants';

export async function main(event) {
  const { authorizationToken } = event;
  const { executeResourceArns } = process.env;

  const decodedToken = jwt.decode(authorizationToken, { complete: true });

  if (!decodedToken) {
    console.error('Malformed JWT');
    throw Error('Unauthorized');
  }

  const { header, payload } = decodedToken;

  if (header.alg !== JWT.ALG) {
    console.error('Wrong algorithm found in JWT');
    throw Error('Unauthorized');
  }

  const jwksUrl = getjwksUrl(payload.tid, payload.aud);
  const [jwksError, jwksResult] = await to(axios.get(jwksUrl));
  if (jwksError) {
    console.error('Could not fetch JWKs: ', jwksError);
    throw Error('Unauthorized');
  }

  const { keys } = jwksResult.data;
  const signingKeys = getValidSigningKeys(keys);
  if (signingKeys.length === 0) {
    console.error('No valid signing keys found');
    throw Error('Unauthorized');
  }

  const signingKey = signingKeys.find(({ kid }) => kid === header.kid);
  if (!signingKey) {
    console.error('No signing key with matching "kid" where found');
    throw Error('Unauthorized');
  }

  jwt.verify(authorizationToken, signingKey.publicKey, error => {
    if (error) {
      console.error('Failed to verify JWT: ', error);
      throw Error('Unauthorized');
    }
  });

  const iamPolicy = generateIAMPolicy('officeUser', 'Allow', executeResourceArns);

  return iamPolicy;
}
