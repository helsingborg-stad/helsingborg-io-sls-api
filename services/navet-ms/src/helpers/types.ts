export interface NavetClientError {
  response: {
    data: string;
  };
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

export interface NavetUserResponse {
  Folkbokforingspost: {
    Personpost: NavetUser;
    Sekretessmarkering: string;
    SkyddadFolkbokforing: string;
  };
}

export interface CaseUser {
  personalNumber: string;
  firstName: string;
  lastName: string;
  address: {
    street: string;
    postalCode: string;
    city: string;
  };
  civilStatus: string;
}
