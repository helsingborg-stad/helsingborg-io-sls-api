import getValidSigningKey, { SigningKey } from '../../src/helpers/getValidSigningKey';
import { beginCertificateString, endCertificateString } from '../../src/constants';

const correctKey: SigningKey = {
  kty: 'RSA',
  use: 'sig',
  kid: 'kid_1',
  x5t: 'x5t_1',
  n: 'n_1',
  e: 'e_1',
  x5c: ['x5c_1'],
  issuer: 'https://mock.com',
};

const wrongKey = {
  use: 'sig',
  kty: 'RSA',
  x5c: ['x5c_2'],
  issuer: 'https://mock.com',
};

it('returns a valid signing key', () => {
  const expectedResult = {
    kid: 'kid_1',
    publicKey: `${beginCertificateString}x5c_1${endCertificateString}`,
  };

  const result = getValidSigningKey(correctKey);

  expect(result).toEqual(expectedResult);
});

it('returns undefined if key is invalid', () => {
  const result = getValidSigningKey(wrongKey as SigningKey);

  expect(result).toBeUndefined();
});
