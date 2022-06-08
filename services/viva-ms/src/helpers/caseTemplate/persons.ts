import deepMerge from 'lodash.merge';
import type { CaseFormAnswer, CasePerson, ValidTags } from '../../types/caseItem';
import { CasePersonRole } from '../../types/caseItem';
import formHelpers from '../formHelpers';
import type { Occupation } from './occupation';
import { createOccupations } from './occupation';
import type { Human } from './shared';

export interface TemplatePerson extends Partial<Human> {
  phone?: string;
  email?: string;
  occupations?: Partial<Occupation>[];
  citizenship?: string;
}

interface RoleAnswers {
  role: CasePersonRole;
  answers: CaseFormAnswer[];
}

interface PersonAnswers extends RoleAnswers {
  person?: CasePerson;
}

function createPartialCasePersonFromAnswers(answers: CaseFormAnswer[]): Partial<CasePerson> {
  return {
    firstName: formHelpers.getFirstAnswerValueByTags(answers, ['firstName']),
    lastName: formHelpers.getFirstAnswerValueByTags(answers, ['lastName']),
    personalNumber: formHelpers.getFirstAnswerValueByTags(answers, ['personalNumber']),
  };
}

function pairAnswersByRoles(answers: CaseFormAnswer[]): RoleAnswers[] {
  const roleTagPairsToUse: { role: CasePersonRole; tag: ValidTags }[] = [
    {
      role: CasePersonRole.Applicant,
      tag: 'applicant',
    },
    {
      role: CasePersonRole.CoApplicant,
      tag: 'coapplicant',
    },
  ];

  return roleTagPairsToUse.map(pair => ({
    role: pair.role,
    answers: formHelpers.filterByTags(answers, [pair.tag]),
  }));
}

function pairPersonToRoleAnswers(persons: CasePerson[], roleAnswers: RoleAnswers): PersonAnswers {
  return {
    ...roleAnswers,
    person: persons.find(person => person.role === roleAnswers.role),
  };
}

function getCitizenship(answers: CaseFormAnswer[]): string {
  return formHelpers.getFirstAnswerValueByTags(answers, ['citizenship']) ?? '';
}

function createTemplatePerson(
  person: CasePerson | undefined,
  answers: CaseFormAnswer[]
): TemplatePerson {
  const casePersonFromAnswers = createPartialCasePersonFromAnswers(answers);
  const mergedCasePerson: CasePerson = deepMerge({}, person, casePersonFromAnswers);

  return {
    ...mergedCasePerson,
    phone: formHelpers.getFirstAnswerValueByTags(answers, ['phonenumber']) ?? '',
    email: formHelpers.getFirstAnswerValueByTags(answers, ['email']) ?? '',
    occupations: createOccupations(answers),
    citizenship: getCitizenship(answers),
  };
}

export function createTemplatePersons(
  persons: CasePerson[],
  answers: CaseFormAnswer[]
): TemplatePerson[] {
  const allRoleAnswers = pairAnswersByRoles(answers);
  const allPersonAnswers = allRoleAnswers.map(roleAnswers =>
    pairPersonToRoleAnswers(persons, roleAnswers)
  );
  return allPersonAnswers.map(({ person, answers }) => createTemplatePerson(person, answers));
}
