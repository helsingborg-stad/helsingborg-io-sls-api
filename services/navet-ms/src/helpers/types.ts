export interface ClientResponseError {
  response: {
    data: string;
  };
}

export interface ClientResponse {
  data: string;
}

export interface NavetPayloadParams {
  personalNumber: string;
  orderNumber: string;
  organisationNumber: string;
  xmlEnvUrl: string;
}

export interface NavetPersonId {
  PersonNr: string;
}

export interface NavetPersonName {
  Fornamn: string;
  Efternamn: string;
}

export interface NavetPersonAddress {
  Folkbokforingsadress: {
    Utdelningsadress2: string;
    PostNr: string;
    Postort: string;
  };
}

export interface NavetPersonMaritalStatus {
  CivilstandKod: string;
}

export interface NavetUser {
  PersonId: NavetPersonId;
  Namn: NavetPersonName;
  Adresser: NavetPersonAddress;
  Civilstand: NavetPersonMaritalStatus;
}

export interface NavetCivilRegistration {
  Personpost: NavetUser;
  Sekretessmarkering: string;
  SkyddadFolkbokforing: string;
}

export interface NavetPerson {
  Folkbokforingspost: NavetCivilRegistration;
}

export interface Adress {
  street: string;
  postalCode: string;
  city: string;
}

export interface CaseUser {
  personalNumber: string;
  firstName: string;
  lastName: string;
  address: Adress;
  civilStatus: string;
}

export interface CivilRegistrationProvider {
  getUserInfo(personalNumber: string): Promise<CaseUser>;
}
