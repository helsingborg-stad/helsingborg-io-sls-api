import parser from 'xml2js';
import { ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

import type { NavetPerson } from './types';

export function parseNavetPerson(xml: string): Promise<NavetPerson> {
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

export function parseErrorMessageFromXML(xml: string): string {
  const parsedOnce = xml?.split('<faultstring>');
  const parsedTwice = parsedOnce[1]?.split('</faultstring>');
  return parsedTwice[0] ?? '';
}
