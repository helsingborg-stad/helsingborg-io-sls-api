import { beginCertificateString, endCertificateString } from '../constants';

export default function certToPEM(certificate: string) {
  let pem = certificate.match(/.{1,64}/g)?.join('\n');
  pem = `${beginCertificateString}${pem}${endCertificateString}`;

  return pem;
}
