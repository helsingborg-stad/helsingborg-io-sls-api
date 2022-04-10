import uuid from 'uuid';

import {
  VivaMyPages,
  VivaMyPagesPersonApplication,
  VivaMyPagesPersonCase,
  VivaPerson,
} from '../types/vivaMyPages';
import {
  CaseForm,
  CasePeriod,
  CasePerson,
  CasePersonRoleType,
  CasePersonRole,
  CaseFormEncryption,
} from '../types/caseItem';

const APPLICANT = 'applicant';
const CO_APPLICANT = 'coApplicant';
const CHILDREN = 'children';

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

  const personList: VivaPerson[] = [];
  personList.push(vivaClient);

  if (Array.isArray(vivaPersons)) {
    personList.push(...vivaPersons);
  } else if (vivaPersons != undefined) {
    personList.push(vivaPersons);
  }

  const roleType: CasePersonRoleType = {
    client: APPLICANT,
    partner: CO_APPLICANT,
    child: CHILDREN,
  };

  const casePersonList = personList.map(vivaPerson => {
    const { pnumber, fname, lname, type } = vivaPerson;
    const person: CasePerson = {
      personalNumber: stripNonNumericalCharacters(pnumber),
      firstName: fname,
      lastName: lname,
      role: roleType[type] ?? 'unknown',
    };

    const isApplicant = [APPLICANT, CO_APPLICANT].includes(person.role);
    person.hasSigned = false && isApplicant;

    return person;
  });

  return casePersonList;
}

function getUserOnRole(personList: CasePerson[], role: CasePersonRole) {
  return personList.find(user => user.role === role);
}

function getVivaChildren(casePersonList: CasePerson[]) {
  return casePersonList.filter(person => person.role === 'children');
}

function getInitialFormAttributes(
  formIdList: string[],
  vivaPerson: VivaMyPages
): Record<string, CaseForm> {
  const encryption = getEncryptionAttributes(vivaPerson);
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

  const [recurringFormId, completionFormId, randomCheckFormId] = formIdList;

  const initialFormList = {
    [recurringFormId]: initialFormAttributes,
    [completionFormId]: initialFormAttributes,
    [randomCheckFormId]: initialFormAttributes,
  };

  return initialFormList;
}

function getEncryptionAttributes(vivaPerson: VivaMyPages): CaseFormEncryption {
  const casePersonList = getCasePersonList(vivaPerson.case);
  const casePersonCoApplicant = getUserOnRole(casePersonList, 'coApplicant');

  if (!casePersonCoApplicant) {
    const applicantEncryptionAttributes = { type: 'decrypted' };
    return applicantEncryptionAttributes;
  }

  const mainApplicantPersonalNumber = stripNonNumericalCharacters(vivaPerson.case.client.pnumber);

  const encryptionAttributes = {
    type: 'decrypted',
    symmetricKeyName: `${mainApplicantPersonalNumber}:${
      casePersonCoApplicant.personalNumber
    }:${uuid.v4()}`,
    primes: {
      P: 43,
      G: 10,
    },
    publicKeys: {
      [mainApplicantPersonalNumber]: null,
      [casePersonCoApplicant.personalNumber]: null,
    },
  };

  return encryptionAttributes;
}

export default {
  stripNonNumericalCharacters,
  getPeriodInMilliseconds,
  getCasePersonList,
  getUserOnRole,
  getVivaChildren,
  getInitialFormAttributes,
};
