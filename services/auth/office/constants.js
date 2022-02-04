const JWK = {
  USE: 'sig',
  KTY: 'RSA',
};

const JWT = {
  ALG: 'RS256',
};

const loginMicrosoftUrl = 'https://login.microsoftonline.com';

const beginCertificateString = '-----BEGIN CERTIFICATE-----\n';
const endCertificateString = '\n-----END CERTIFICATE-----\n';

export { JWK, JWT, loginMicrosoftUrl, beginCertificateString, endCertificateString };
