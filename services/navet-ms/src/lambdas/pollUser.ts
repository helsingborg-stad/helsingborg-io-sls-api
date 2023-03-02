import log from '../libs/logs';
import { putEvent } from '../libs/awsEventBridge';
import { requestNavetUser, getNavetPersonPost } from '../helpers/navet';
import type { NavetUser, CaseUser } from '../helpers/types';

type SuccessEvent = LambdaDetail;

export interface LambdaDetail {
  readonly user: CaseUser;
}

export interface Input {
  readonly detail: LambdaDetail;
}

export interface Dependencies {
  requestNavetUserXml: (personalNumber: string) => Promise<string>;
  getParsedNavetPersonPost: (xml: string) => Promise<NavetUser>;
  triggerEvent: (params: SuccessEvent, detailType: string, source: string) => Promise<void>;
}

function createEventDetail(user: NavetUser): CaseUser {
  return {
    personalNumber: user.PersonId.PersonNr,
    firstName: user.Namn.Fornamn,
    lastName: user.Namn.Efternamn,
    address: {
      street: user?.Adresser?.Folkbokforingsadress?.Utdelningsadress2 ?? null,
      postalCode: user?.Adresser?.Folkbokforingsadress?.PostNr ?? null,
      city: user?.Adresser?.Folkbokforingsadress?.Postort ?? null,
    },
    civilStatus: user.Civilstand.CivilstandKod,
  };
}

export async function pollUser(input: Input, dependencies: Dependencies) {
  const { user } = input.detail;

  const navetXmlResponse = await dependencies.requestNavetUserXml(user.personalNumber);
  const navetUser = await dependencies.getParsedNavetPersonPost(navetXmlResponse);
  const eventDetail = createEventDetail(navetUser);

  await dependencies.triggerEvent(
    { user: eventDetail },
    'navetMsPollUserSuccess',
    'navetMs.pollUser'
  );

  return true;
}

export const main = log.wrap(async event => {
  return pollUser(event, {
    requestNavetUserXml: requestNavetUser,
    getParsedNavetPersonPost: getNavetPersonPost,
    triggerEvent: putEvent,
  });
});
