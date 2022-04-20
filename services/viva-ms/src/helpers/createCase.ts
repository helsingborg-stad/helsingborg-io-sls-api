import uuid from 'uuid';

import {
  VivaMyPagesPersonApplication,
  VivaMyPagesPersonCase,
  VivaPerson,
} from '../types/vivaMyPages';
import {
  CaseForm,
  CasePeriod,
  CasePerson,
  CasePersonRole,
  CaseUser,
  CaseFormEncryption,
} from '../types/caseItem';

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
    startDate: Date.parse(vivaApplication.period.start),
    endDate: Date.parse(vivaApplication.period.end),
  };
}

function getCasePersonList(vivaCase: VivaMyPagesPersonCase): CasePerson[] {
  const vivaPersons = vivaCase.persons;
  const vivaClient = vivaCase.client;
  vivaClient.type = 'client';

  const personList: VivaPerson[] = [vivaClient];

  if (Array.isArray(vivaPersons)) {
    personList.push(...vivaPersons);
  } else if (vivaPersons != undefined) {
    personList.push(vivaPersons);
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

function getVivaChildren(casePersonList: CasePerson[]): CasePerson[] {
  return casePersonList.filter(person => person.role === 'children');
}

function getInitialFormAttributes(
  formIdList: string[],
  encryption: CaseFormEncryption
): Record<string, CaseForm> {
  const initialFormAttributes: CaseForm = {
    answers: [],
    encryption,
    currentPosition: {
      currentMainStep: 1,
      currentMainStepIndex: 0,
      index: 0,
      level: 0,
    },
  };

  return formIdList.reduce(
    (allFormIds, currentFormId) => ({ ...allFormIds, [currentFormId]: initialFormAttributes }),
    {}
  );
}

function getFormEncryptionAttributes(casePerson?: CasePerson): CaseFormEncryption {
  if (casePerson == undefined) {
    return { type: 'decrypted' };
  }

  return {
    type: 'decrypted',
    symmetricKeyName: uuid.v4(),
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
