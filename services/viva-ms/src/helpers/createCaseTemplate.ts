import type { CaseFormAnswer, CaseItem } from './../types/caseItem';
import { Child, createChildren } from './caseTemplate/children';
import { createTemplatePersons, TemplatePerson } from './caseTemplate/persons';
import { createHousing, Housing } from './caseTemplate/housing';
import { Financials, createFinancials } from './caseTemplate/financials';
import { formatTimestampToDate } from './formatPeriodDates';

interface Note {
  title: string;
  text: string;
}
export interface Template {
  period?: {
    startDate: string;
    endDate: string;
  };
  updatedAt: string;
  notes: Note[];
  persons: TemplatePerson[];
  children: Child[];
  housing: Housing;
  financials: Financials;
}

export default function createCaseTemplate(
  caseItem: CaseItem,
  answers: CaseFormAnswer[]
): Template {
  return {
    persons: createTemplatePersons(caseItem.persons, answers),
    children: createChildren(answers),
    housing: createHousing(answers),
    financials: createFinancials(answers),
    updatedAt: formatTimestampToDate(caseItem.updatedAt),
  } as Template;
}
