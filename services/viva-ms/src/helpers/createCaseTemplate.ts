import type { CaseFormAnswer, CaseItem } from './../types/caseItem';
import type { Child } from './caseTemplate/children';
import { createChildren } from './caseTemplate/children';
import type { Financials } from './caseTemplate/financials';
import { createFinancials } from './caseTemplate/financials';
import type { Housing } from './caseTemplate/housing';
import { createHousing } from './caseTemplate/housing';
import type { Note } from './caseTemplate/notes';
import { createNotes } from './caseTemplate/notes';
import type { TemplatePerson } from './caseTemplate/persons';
import { createTemplatePersons } from './caseTemplate/persons';
import { formatTimestampToDate } from './formatPeriodDates';

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
    notes: createNotes(answers),
    updatedAt: formatTimestampToDate(caseItem.updatedAt),
  };
}
