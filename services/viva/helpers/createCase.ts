import uuid from 'uuid';

import {
  VivaMyPagesPersonApplication,
  VivaMyPagesPersonCase,
  VivaPerson,
  VivaPersonType,
} from '../types/vivaMyPages';
import {
  CaseForm,
  CasePeriod,
  CasePerson,
  CasePersonRole,
  CaseUser,
  CaseFormEncryption,
  EncryptionType,
} from '../types/caseItem';

import { DEFAULT_CURRENT_POSITION } from './constants';

export interface CasePersonRoleType {
  readonly client: CasePersonRole.Applicant;
  readonly partner: CasePersonRole.CoApplicant;
  readonly child: CasePersonRole.Children;
}

const ROLE_TYPE: CasePersonRoleType = {
  client: CasePersonRole.Applicant,
  partner: CasePersonRole.CoApplicant,
  child: CasePersonRole.Children,
};

function stripNonNumericalCharacters(valueIncludingChars: string) {
  const matchNonNumericalCharactersRegex = /\D/g;
  return valueIncludingChars.replace(matchNonNumericalCharactersRegex, '');
}

function getPeriodInMilliseconds(vivaApplication: VivaMyPagesPersonApplication): CasePeriod {
  return {
    startDate: Date.parse(`${vivaApplication.period.start}T00:00:00.000Z`),
    endDate: Date.parse(`${vivaApplication.period.end}T00:00:00.000Z`),
  };
}

function getCasePersonList(vivaCase: VivaMyPagesPersonCase): CasePerson[] {
  const vivaPerson = vivaCase.persons?.person;
  const vivaClient = vivaCase.client;
  vivaClient.type = VivaPersonType.Client;

  const personList: VivaPerson[] = [vivaClient as VivaPerson];

  if (Array.isArray(vivaPerson)) {
    personList.push(...vivaPerson);
  } else if (vivaPerson != undefined) {
    personList.push(vivaPerson);
  }

  return personList.map(mapperCasePersonFromVivaPerson);
}

function mapperCasePersonFromVivaPerson(vivaPerson: VivaPerson): CasePerson {
  const { pnumber, fname, lname, type } = vivaPerson;
  const role = ROLE_TYPE[type] ?? CasePersonRole.Unknown;
  const isApplicant = [CasePersonRole.Applicant, CasePersonRole.CoApplicant].includes(role);

  const person: CasePerson = {
    personalNumber: stripNonNumericalCharacters(pnumber),
    firstName: fname,
    lastName: lname,
    role,
  };

  if (isApplicant) {
    person.hasSigned = false;
  }

  return person;
}

function createCaseApplicantPerson(user: CaseUser): CasePerson {
  const { personalNumber, firstName, lastName } = user;
  return {
    personalNumber,
    firstName,
    lastName,
    role: CasePersonRole.Applicant,
    hasSigned: false,
  };
}

function getUserByRole(personList: CasePerson[], role: CasePersonRole): CasePerson | undefined {
  return personList.find(user => user.role === role);
}

function getVivaChildren(personList: CasePerson[]): CasePerson[] {
  return personList.filter(person => person.role === CasePersonRole.Children);
}

function getInitialFormAttributes(
  formIdList: string[],
  encryption: CaseFormEncryption
): Record<string, CaseForm> {
  const initialFormAttributes: CaseForm = {
    encryption,
    answers: [],
    currentPosition: DEFAULT_CURRENT_POSITION,
  };

  return formIdList.reduce(
    (allFormIds, currentFormId) => ({ ...allFormIds, [currentFormId]: initialFormAttributes }),
    {}
  );
}

function getFormEncryptionAttributes(isCoApplicant: boolean): CaseFormEncryption {
  return {
    type: EncryptionType.Decrypted,
    ...(isCoApplicant && { symmetricKeyName: uuid.v4() }),
  };
}

export default {
  stripNonNumericalCharacters,
  getPeriodInMilliseconds,
  getCasePersonList,
  getUserByRole,
  getVivaChildren,
  getInitialFormAttributes,
  getFormEncryptionAttributes,
  createCaseApplicantPerson,
};
