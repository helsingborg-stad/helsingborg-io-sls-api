import * as convert from 'xml-js';

export const parseXml = params => `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="${params.personpostXmlEnvUrl}">
  <soapenv:Header/>
  <soapenv:Body>
    <v1:PersonpostRequest>
      <v1:Bestallning>
        <v1:OrgNr>${params.orgNr}</v1:OrgNr>
        <v1:BestallningsId>${params.orderNr}</v1:BestallningsId>
      </v1:Bestallning>
      <v1:PersonId>${params.personalNumber}</v1:PersonId>
    </v1:PersonpostRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

export const parseJSON = input =>
  new Promise((resolve, reject) => {
    try {
      const posts = input.split('Folkbokforingsposter>');
      // If result has any posts the length will be bigger then 2.
      if (posts.length >= 2) {
        const parsedTwice = posts[1].split('</ns0:');
        const resParsed = convert.xml2json(parsedTwice[0], {
          compact: true,
          spaces: 0,
          trim: true,
        });
        resolve(JSON.parse(resParsed));
      }
      resolve(input);
    } catch (error) {
      reject(error);
    }
  });

// export const parseJSONError = input =>
//   new Promise((resolve, reject) => {
//     try {
//       const parsedOnce = input.split('<faultstring>');
//       const parsedTwice = parsedOnce[1].split('</faultstring>');
//       resolve(parsedTwice[0]);
//     } catch (error) {
//       reject(error);
//     }
//   });
