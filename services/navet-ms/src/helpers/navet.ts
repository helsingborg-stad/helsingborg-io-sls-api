import { InternalServerError, UnauthorizedError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as request from '../libs/request';
import params from '../libs/params';
import config from '../libs/config';

import getNavetRequestClient from './client';
import {
  getPersonPostSoapRequestPayload,
  getErrorMessageFromXML,
  getPersonPostCollection,
} from './parser';

import type { NavetUser, NavetClientError, NavetUserResponse } from './types';

export async function requestNavetUser(personalNumber: string): Promise<string> {
  const ssmParams = await params.read(config.navet.envsKeyName);

  const [getNavetClientError, navetRequestClient] = await to(getNavetRequestClient(ssmParams));
  if (getNavetClientError) {
    throw getNavetClientError;
  }

  const personPostSoapRequestPayload = getPersonPostSoapRequestPayload({
    personalNumber,
    orderNumber: ssmParams.orderNr,
    organisationNumber: ssmParams.orgNr,
    xmlEnvUrl: ssmParams.personpostXmlEnvUrl,
  });

  const [postNavetClientError, navetResponse] = (await to(
    request.call(
      navetRequestClient,
      'post',
      ssmParams.personpostXmlEndpoint,
      personPostSoapRequestPayload
    )
  )) as [NavetClientError, { data: string }];

  if (postNavetClientError?.response?.data) {
    throw getErrorMessageFromXML(postNavetClientError.response.data);
  }

  if (postNavetClientError) {
    throw postNavetClientError;
  }

  return navetResponse.data;
}

export async function getNavetPersonPost(xml: string): Promise<NavetUser> {
  const [getPersonPostError, parsedNavetPerson] = await to(getPersonPostCollection(xml));
  if (getPersonPostError) {
    throw getPersonPostError;
  }

  const { Folkbokforingspost } = parsedNavetPerson as NavetUserResponse;
  if (Folkbokforingspost?.Personpost === undefined) {
    throw new InternalServerError();
  }

  if (isPersonConfidential(parsedNavetPerson as NavetUserResponse)) {
    throw new UnauthorizedError();
  }

  return Folkbokforingspost.Personpost;
}

export function isPersonConfidential(navetPerson: NavetUserResponse): boolean {
  const {
    Folkbokforingspost: { Sekretessmarkering, SkyddadFolkbokforing },
  } = navetPerson;

  return [Sekretessmarkering, SkyddadFolkbokforing].includes('J');
}
