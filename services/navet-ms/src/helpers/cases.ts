import type { CaseUser, NavetUser } from './types';

export default function createCaseUserFromNavet(navet: NavetUser): CaseUser {
  return {
    personalNumber: navet.PersonId.PersonNr,
    firstName: navet.Namn.Fornamn,
    lastName: navet.Namn.Efternamn,
    address: {
      street: navet?.Adresser?.Folkbokforingsadress?.Utdelningsadress2 ?? null,
      postalCode: navet?.Adresser?.Folkbokforingsadress?.PostNr ?? null,
      city: navet?.Adresser?.Folkbokforingsadress?.Postort ?? null,
    },
    civilStatus: navet.Civilstand.CivilstandKod,
  };
}
