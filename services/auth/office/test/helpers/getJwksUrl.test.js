import getJwksUrl from '../../src/helpers/getJwksUrl';

import { loginMicrosoftUrl } from '../../src/constants';

it('successfully creates a jwks url for Microsoft', () => {
  const tid = 'mockTid';
  const aud = 'mockAud';
  const expectedResult = `${loginMicrosoftUrl}/${tid}/discovery/v2.0/keys?appid=${aud}`;

  const result = getJwksUrl(tid, aud);

  expect(result).toBe(expectedResult);
});
