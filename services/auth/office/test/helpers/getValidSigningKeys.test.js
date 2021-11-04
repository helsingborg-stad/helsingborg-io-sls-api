import getValidSigningKeys from '../../helpers/getValidSigningKeys';
import { beginCertificateString, endCertificateString } from '../../constants';

const correctKey = {
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

it('returns valid signing keys', () => {
  const expectedResult = {
    kid: 'kid_1',
    publicKey: `${beginCertificateString}x5c_1${endCertificateString}`,
  };

  const result = getValidSigningKeys([correctKey, wrongKey]);

  expect(result).toEqual([expectedResult]);
});
