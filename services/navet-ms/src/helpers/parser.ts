import parser from 'xml2js';
import { ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import type { NavetUserResponse } from './types';

interface Input {
  personalNumber: string;
  orderNumber: string;
  organisationNumber: string;
  xmlEnvUrl: string;
}

export function getPersonPostSoapRequestPayload({
  personalNumber,
  orderNumber,
  organisationNumber,
  xmlEnvUrl,
}: Input): string {
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="${xmlEnvUrl}">
  <soapenv:Header/>
  <soapenv:Body>
    <v1:PersonpostRequest>
      <v1:Bestallning>
        <v1:OrgNr>${organisationNumber}</v1:OrgNr>
        <v1:BestallningsId>${orderNumber}</v1:BestallningsId>
      </v1:Bestallning>
      <v1:PersonId>${personalNumber}</v1:PersonId>
    </v1:PersonpostRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

export function getPersonPostCollection(xml: string): Promise<NavetUserResponse> {
  return new Promise((resolve, reject) => {
    try {
      const xmlPersonPostArray = xml.split('Folkbokforingsposter>');

      if (xmlPersonPostArray.length < 2) {
        throw new ResourceNotFoundError();
      }
      const [, xmlPersonPost] = xmlPersonPostArray;
      const [xmlPersonPostElement] = xmlPersonPost.split('</ns0:');

      const options = {
        trim: true,
        explicitArray: false,
      };

      parser.parseString(xmlPersonPostElement, options, (error, result) => {
        if (error) {
          throw error;
        }

        resolve(result);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function getErrorMessageFromXML(xml: string): string {
  const parsedOnce = xml?.split('<faultstring>');
  const parsedTwice = parsedOnce[1]?.split('</faultstring>');
  return parsedTwice[0] ?? '';
}
