import { VivaMyPages, VivaMyPagesPersonCase } from '../types/vivaMyPages';
import { CasePeriod } from '../types/caseItem';

function stripNonNumericalCharacters(valueIncludingChars: string): number {
  const matchNonNumericalCharactersRegex = /\D/g;
  return +valueIncludingChars.replace(matchNonNumericalCharactersRegex, '');
}

function getPeriodInMilliseconds(person: VivaMyPages): CasePeriod {
  const userCasePperiod: CasePeriod = {
    startDate: Date.parse(person.application.period.start),
    endDate: Date.parse(person.application.period.end),
  };
  return userCasePperiod;
}

function getCasePersonList(person: VivaPerson) {
  const personItem = person.case.persons?.person;
  const client: VivaPersonClient = person.case.client;
  client['type'] = 'client';

  const vivaPersonList = [];
  vivaPersonList.push(client);

  if (Array.isArray(personItem)) {
    vivaPersonList.push(...personItem);
  } else if (personItem != undefined) {
    vivaPersonList.push(personItem);
  }

  const APPLICANT = 'applicant';
  const CO_APPLICANT = 'coApplicant';
  const CHILDREN = 'children';

  const roleType = {
    client: APPLICANT,
    partner: CO_APPLICANT,
    child: CHILDREN,
  };

  const casePersonList = vivaPersonList.map(personItem => {
    const { pnumber, fname: firstName, lname: lastName, type } = personItem;
    const personalNumber = stripNonNumericalCharacters(String(pnumber));

    const person = {
      personalNumber,
      firstName,
      lastName,
      role: roleType[type] || 'unknown',
    };

    if ([APPLICANT, CO_APPLICANT].includes(person.role)) {
      person['hasSigned'] = false;
    }

    return person;
  });

  return casePersonList;
}

function getUserOnRole(userList, role: string) {
  const user = userList.find(user => user.role == role);
  return user;
}

export default {
  stripNonNumericalCharacters,
  getPeriodInMilliseconds,
  getCasePersonList,
  getUserOnRole,
};
