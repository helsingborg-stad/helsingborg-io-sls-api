import uuid from 'uuid';

import { VivaPersonType } from '../types/vivaMyPages';
import { EncryptionType, CasePersonRole } from '../types/caseItem';
import type {
  VivaMyPagesApplicationPeriod,
  VivaMyPagesVivaCase,
  VivaPerson,
} from '../types/vivaMyPages';
import type {
  CaseForm,
  CasePeriod,
  CasePerson,
  CaseUser,
  CaseFormEncryption,
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

function getPeriodInMilliseconds(vivaApplicationPeriod: VivaMyPagesApplicationPeriod): CasePeriod {
  return {
    startDate: Date.parse(`${vivaApplicationPeriod.start}T00:00:00.000Z`),
    endDate: Date.parse(`${vivaApplicationPeriod.end}T00:00:00.000Z`),
  };
}

function getCasePersonList(vivaCase: VivaMyPagesVivaCase): CasePerson[] {
  const vivaPerson = vivaCase.persons?.person;
  const vivaClient: VivaPerson = {
    ...vivaCase.client,
    type: VivaPersonType.Client,
  };

  const personList: VivaPerson[] = [vivaClient];

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

function createPeriodStartDate(): number {
  const nowDate = new Date();
  const startDateUTC = new Date(
    Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate())
  );
  return startDateUTC.getTime();
}

function getFormEncryptionAttributes(): CaseFormEncryption {
  const keyId = uuid.v4();
  return {
    type: EncryptionType.Decrypted,
    symmetricKeyName: keyId,
    encryptionKeyId: keyId,
  };
}

function createGSI2SK(period: CasePeriod): string {
  const dateTime = new Date(period.startDate);
  const utcFullYear = new Date(dateTime).getUTCFullYear();
  const utcMonth = new Date(dateTime).getUTCMonth() + 1;
  const twoDigitsUtcMonth = utcMonth < 10 ? `0${utcMonth}` : utcMonth;
  return `YEAR#${utcFullYear}#MONTH#${twoDigitsUtcMonth}`;
}

function createMetricGSI2PK(): string {
  return 'METRIC#period';
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
  createPeriodStartDate,
  createMetricGSI2PK,
  createGSI2SK,
};
