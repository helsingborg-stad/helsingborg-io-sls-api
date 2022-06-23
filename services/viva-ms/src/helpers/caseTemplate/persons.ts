import deepMerge from 'lodash.merge';
import type { CaseFormAnswer, CasePerson } from '../../types/caseItem';
import { CasePersonRole } from '../../types/caseItem';
import * as formHelpers from '../formHelpers';
import { FinancialEntry, makeFinancialEntryIfValid } from './financials';
import type { Occupation } from './occupation';
import { createOccupations } from './occupation';
import { mapToCommonValue, ValidTags } from './shared';
import { filterValid, groupAnswersByGroupTag, Human } from './shared';

export interface TemplatePerson extends Partial<Human> {
  phone?: string;
  email?: string;
  occupations?: Partial<Occupation>[];
  citizenship?: string;
  incomes: FinancialEntry[];
  expenses: FinancialEntry[];
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

function mapSalary(answers: CaseFormAnswer[], index: number): FinancialEntry {
  return {
    ...mapToCommonValue(answers),
    title: `Lön ${index + 1}`,
  };
}

function mapOtherIncome(answers: CaseFormAnswer[]): FinancialEntry {
  return {
    ...mapToCommonValue(answers),
    title: formHelpers.getFirstAnswerValueByTags(answers, ['description']) ?? 'Annan inkomst',
  };
}

function getForeignPension(answers: CaseFormAnswer[]): FinancialEntry | undefined {
  const foreignPensionAnswer = formHelpers.getFirstAnswerValueByTags(answers, ['foreignPension']);
  return foreignPensionAnswer
    ? <FinancialEntry>{
        ...mapToCommonValue(answers),
        title: 'Utländsk pension',
      }
    : undefined;
}

function getIncomes(answers: CaseFormAnswer[]): FinancialEntry[] {
  const salaryAnswers = formHelpers.filterByTags(answers, ['incomes', 'lon']);
  const groupedSalaryAnswers = groupAnswersByGroupTag(salaryAnswers);
  const salaries = groupedSalaryAnswers.map(mapSalary);

  const otherAnswers = formHelpers.filterByTags(answers, ['incomes', 'other']);
  const groupedOtherAnswers = groupAnswersByGroupTag(otherAnswers);
  const otherIncomes = groupedOtherAnswers.map(mapOtherIncome);

  const foreignPension = getForeignPension(answers);

  return filterValid([...salaries, ...otherIncomes, foreignPension]);
}

function mapMedicine(answers: CaseFormAnswer[]): FinancialEntry {
  const description = formHelpers.getFirstAnswerValueByTags<string>(answers, ['description']);
  return {
    ...mapToCommonValue(answers),
    title: description ?? 'Medicin',
  };
}

function mapDental(answers: CaseFormAnswer[]): FinancialEntry {
  return {
    ...mapToCommonValue(answers),
    title: 'Tandvård',
  };
}

function mapOtherExpense(answers: CaseFormAnswer[]): FinancialEntry {
  const description = formHelpers.getFirstAnswerValueByTags<string>(answers, ['description']);
  return {
    ...mapToCommonValue(answers),
    title: description ?? 'Övrig utgift',
  };
}

function getExpenses(answers: CaseFormAnswer[]): FinancialEntry[] {
  const relevantAnswers = formHelpers.filterByTags(answers, ['expenses']);

  const union = makeFinancialEntryIfValid(
    'A-kassa och fackavgift',
    formHelpers.getFirstAnswerValueByTags(relevantAnswers, ['akassa'])
  );

  const medicineAnswers = groupAnswersByGroupTag(
    formHelpers.filterByTags(relevantAnswers, ['medicin'])
  );
  const medicineEntries = medicineAnswers.map(mapMedicine);

  const dentalAnswers = groupAnswersByGroupTag(
    formHelpers.filterByTags(relevantAnswers, ['tandvard'])
  );
  const dentalEntries = dentalAnswers.map(mapDental);

  const otherAnswers = groupAnswersByGroupTag(formHelpers.filterByTags(relevantAnswers, ['annat']));
  const otherEntries = otherAnswers.map(mapOtherExpense);

  return filterValid([union, ...medicineEntries, ...dentalEntries, ...otherEntries]);
}

function createTemplatePerson(
  person: CasePerson | undefined,
  role: CasePersonRole,
  answers: CaseFormAnswer[]
): TemplatePerson {
  const casePersonFromAnswers = createPartialCasePersonFromAnswers(answers);
  const mergedCasePerson: CasePerson = deepMerge({}, person, casePersonFromAnswers);

  return {
    ...mergedCasePerson,
    role,
    phone: formHelpers.getFirstAnswerValueByTags(answers, ['phonenumber']) ?? '',
    email: formHelpers.getFirstAnswerValueByTags(answers, ['email']) ?? '',
    occupations: createOccupations(answers),
    citizenship: getCitizenship(answers),
    incomes: getIncomes(answers),
    expenses: getExpenses(answers),
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

  const personAnswersWithAnyAnswers = allPersonAnswers.filter(
    personAnswers => personAnswers.answers.length > 0
  );

  return personAnswersWithAnyAnswers.map(({ person, answers, role }) =>
    createTemplatePerson(person, role, answers)
  );
}
