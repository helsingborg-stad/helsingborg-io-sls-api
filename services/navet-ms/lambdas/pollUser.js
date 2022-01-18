/* eslint-disable no-console */
import to from 'await-to-js';
import {
  InternalServerError,
  UnauthorizedError,
} from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import {
  getPersonPostSoapRequestPayload,
  getErrorMessageFromXML,
  getPersonPostCollection,
} from '../helpers/parser';
import getNavetRequestClient from '../helpers/client';
import { putEvent } from '../../../libs/awsEventBridge';
import * as request from '../../../libs/request';

import log from '../../../libs/logs';

const NAVET_PARAMS = params.read(config.navet.envsKeyName);

export async function main(event, context) {
  const { user } = event.detail;

  const [requestNavetUserError, navetUser] = await to(
    requestNavetUser(user.personalNumber)
  );
  if (requestNavetUserError) {
    log.error(
      'Navet request user error',
      context.awsRequestId,
      'service-navet-ms-pollUser-001',
      requestNavetUserError
    );
    return;
  }

  const eventDetail = getNavetPollEventDetail(navetUser);
  await putEvent(eventDetail, 'navetMsPollUserSuccess', 'navetMs.pollUser');

  return true;
}

function getNavetPollEventDetail(navetUser) {
  const eventDetail = {
    personalNumber: navetUser.PersonId.PersonNr,
    firstName: navetUser.Namn.Fornamn,
    lastName: navetUser.Namn.Efternamn,
    address: {
      street: navetUser.Adresser.Folkbokforingsadress.Utdelningsadress2,
      postalCode: navetUser.Adresser.Folkbokforingsadress.PostNr,
      city: navetUser.Adresser.Folkbokforingsadress.Postort,
    },
    civilStatus: navetUser.Civilstand.CivilstandKod,
  };

  return eventDetail;
}

async function requestNavetUser(personalNumber) {
  const ssmParams = await NAVET_PARAMS;

  const [getNavetClientError, navetRequestClient] = await to(
    getNavetRequestClient(ssmParams)
  );
  if (getNavetClientError) {
    throw getNavetClientError;
  }

  const personPostSoapRequestPayload = getPersonPostSoapRequestPayload({
    personalNumber,
    orderNumber: ssmParams.orderNr,
    organisationNumber: ssmParams.orgNr,
    xmlEnvUrl: ssmParams.personpostXmlEnvUrl,
  });

  const [postNavetClientError, navetUser] = await to(
    request.call(
      navetRequestClient,
      'post',
      ssmParams.personpostXmlEndpoint,
      personPostSoapRequestPayload
    )
  );
  if (postNavetClientError) {
    if (postNavetClientError.response) {
      const [, navetResponseXmlErrorMessage] = await to(
        getErrorMessageFromXML(postNavetClientError.response.data)
      );

      throw navetResponseXmlErrorMessage;
    }

    throw postNavetClientError;
  }

  return await getNavetPersonPost(navetUser);
}

async function getNavetPersonPost(navetUser) {
  const [getPersonPostError, navetPerson] = await to(
    getPersonPostCollection(navetUser.data)
  );
  if (getPersonPostError) {
    throw getPersonPostError;
  }

  const { Folkbokforingspost } = navetPerson;
  if (Folkbokforingspost.Personpost === undefined) {
    throw new InternalServerError();
  }

  if (isPersonConfidential(navetPerson)) {
    throw new UnauthorizedError();
  }

  return Folkbokforingspost.Personpost;
}

function isPersonConfidential(navetPerson) {
  const {
    Folkbokforingspost: { Sekretessmarkering, SkyddadFolkbokforing },
  } = navetPerson;

  if (Sekretessmarkering === 'J' || SkyddadFolkbokforing === 'J') {
    return true;
  }

  return false;
}
