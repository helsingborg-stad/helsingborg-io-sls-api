import { InternalServerError, UnauthorizedError } from '@helsingborg-stad/npm-api-error-handling';
import * as request from '../libs/request';
import params from '../libs/params';
import config from '../libs/config';
import createNavetRequestClient from './client';
import { parseNavetPerson, parseErrorMessageFromXML } from './parser';
import type { NavetUser, NavetPayloadParams, NavetPerson } from './types';

function createNavetRequestPayload(params: NavetPayloadParams): string {
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="${params.xmlEnvUrl}">
  <soapenv:Header/>
  <soapenv:Body>
    <v1:PersonpostRequest>
      <v1:Bestallning>
        <v1:OrgNr>${params.organisationNumber}</v1:OrgNr>
        <v1:BestallningsId>${params.orderNumber}</v1:BestallningsId>
      </v1:Bestallning>
      <v1:PersonId>${params.personalNumber}</v1:PersonId>
    </v1:PersonpostRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

export async function requestNavet(personalNumber: string): Promise<string> {
  const ssmParams = await params.read(config.navet.envsKeyName);
  const navetRequestClient = await createNavetRequestClient(ssmParams);

  const navetResponse = await request.call(
    navetRequestClient,
    'post',
    ssmParams.personpostXmlEndpoint,
    createNavetRequestPayload({
      personalNumber,
      orderNumber: ssmParams.orderNr,
      organisationNumber: ssmParams.orgNr,
      xmlEnvUrl: ssmParams.personpostXmlEnvUrl,
    })
  );

  if (navetResponse?.respons?.data) {
    throw parseErrorMessageFromXML(navetResponse?.response?.data);
  }

  return navetResponse.data;
}

export async function getNavetPersonInfo(xml: string): Promise<NavetUser> {
  const person = await parseNavetPerson(xml);

  const { Folkbokforingspost } = person;
  if (Folkbokforingspost.Personpost == undefined) {
    throw new InternalServerError();
  }

  if (isPersonConfidential(person)) {
    throw new UnauthorizedError();
  }

  return Folkbokforingspost.Personpost;
}

function isPersonConfidential(person: NavetPerson): boolean {
  return [
    person.Folkbokforingspost.Sekretessmarkering,
    person.Folkbokforingspost.SkyddadFolkbokforing,
  ].includes('J');
}
