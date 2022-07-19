import { putEvent } from '../libs/awsEventBridge';

import log from '../libs/logs';

import { requestNavetUser, getNavetPersonPost } from '../helpers/navet';

import type { NavetUser, CaseUser } from '../helpers/types';

export interface LambdaDetail {
  readonly user: CaseUser;
}

export interface Input {
  readonly detail: LambdaDetail;
}

export interface Dependencies {
  requestNavetUserXml: (personalNumber: string) => Promise<string>;
  getParsedNavetPersonPost: (xml: string) => Promise<NavetUser>;
  putSuccessEvent: (eventDetail: CaseUser, detailType: string, source: string) => Promise<void>;
}

export async function pollUser(input: Input, dependencies: Dependencies) {
  const { user } = input.detail;

  const { requestNavetUserXml, getParsedNavetPersonPost, putSuccessEvent } = dependencies;

  const navetXmlResponse = await requestNavetUserXml(user.personalNumber);
  const navetUser = await getParsedNavetPersonPost(navetXmlResponse);
  const eventDetail = getNavetPollEventDetail(navetUser);

  await putSuccessEvent(eventDetail, 'navetMsPollUserSuccess', 'navetMs.pollUser');

  return true;
}

function getNavetPollEventDetail(navetUser: NavetUser): CaseUser {
  return {
    personalNumber: navetUser.PersonId.PersonNr,
    firstName: navetUser.Namn.Fornamn,
    lastName: navetUser.Namn.Efternamn,
    address: {
      street: navetUser?.Adresser?.Folkbokforingsadress?.Utdelningsadress2,
      postalCode: navetUser?.Adresser?.Folkbokforingsadress?.PostNr,
      city: navetUser?.Adresser?.Folkbokforingsadress?.Postort,
    },
    civilStatus: navetUser.Civilstand.CivilstandKod,
  };
}

export const main = log.wrap(async event => {
  return pollUser(event, {
    requestNavetUserXml: requestNavetUser,
    getParsedNavetPersonPost: getNavetPersonPost,
    putSuccessEvent: putEvent,
  });
});
