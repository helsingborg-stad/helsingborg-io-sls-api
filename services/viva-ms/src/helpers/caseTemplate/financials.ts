import type { CaseFormAnswer, ValidTags } from '../../types/caseItem';
import formHelpers from '../formHelpers';
import {
  filterCheckedTags,
  parseRelativeMonth,
  groupAnswersByGroupTag,
  filterValid,
} from './shared';

// TODO: move
export interface FinancialEntry {
  title: string;
  value: number;
  date?: string;
}

export interface Expenses {
  housing: FinancialEntry[];
  children: FinancialEntry[];
}

export interface Financials {
  governmentAids: string[];
  expenses: Expenses;
  residentIncomes: FinancialEntry[];
  assets: FinancialEntry[];
}

enum ValidAids {
  unemployment = 'unemployment',
  insurance = 'insurance',
  csn = 'csn',
  pension = 'pension',
}

const friendlyAidNames: Record<ValidAids, string> = {
  unemployment: 'A-kassa',
  insurance: 'Försäkringskassan',
  csn: 'CSN',
  pension: 'Pensionsmyndigheten',
};

function createGovernmentAids(answers: CaseFormAnswer[]): string[] {
  const aidAnswers = formHelpers.filterByTags(answers, ['aid']);
  const validAids = Object.values(ValidAids) as ValidTags[];

  const checkedAids = filterCheckedTags(aidAnswers, validAids);
  const friendlyNames = checkedAids.map(aidTag => friendlyAidNames[aidTag as ValidAids]);
  return friendlyNames;
}

enum ValidHousingExpensesCategories {
  boende = 'boende',
  electricity = 'electricity',
  homeinsurance = 'homeinsurance',
  internet = 'internet',
}

const friendlyHousingExpensesCategoryNames: Record<ValidHousingExpensesCategories, string> = {
  boende: 'Hyra/avgift',
  electricity: 'El',
  homeinsurance: 'Hemförsäkring',
  internet: 'Internet',
};

function makeHousingExpenseTitle(category: string, answer: CaseFormAnswer): string {
  const categoryTitle = friendlyHousingExpensesCategoryNames[category];
  const monthTag = answer.field.tags.filter(tag => tag.startsWith('month'))[0];

  if (monthTag) {
    const monthName = parseRelativeMonth(monthTag);
    return `${categoryTitle} ${monthName}`;
  }
  return categoryTitle;
}

function createHousingExpenses(answers: CaseFormAnswer[]): FinancialEntry[] {
  const categories = Object.values(ValidHousingExpensesCategories) as ValidTags[];

  const answersGroupedByCategory = categories.map(category => ({
    category,
    answers: formHelpers.filterByTags(answers, [category]),
  }));

  const financialEntries = answersGroupedByCategory.reduce((acc, categoryAnswers) => {
    const entries: FinancialEntry[] = categoryAnswers.answers.map(answer => ({
      title: makeHousingExpenseTitle(categoryAnswers.category, answer),
      value: parseFloat(answer.value as string),
    }));
    return [...acc, ...entries];
  }, [] as FinancialEntry[]);

  return financialEntries;
}

function getChildcareExpense(answers: CaseFormAnswer[]): FinancialEntry | undefined {
  const childcareValue = formHelpers.getFirstAnswerValueByTags<string>(answers, ['childcare']);
  if (childcareValue) {
    return {
      title: 'Barnomsorg',
      value: parseFloat(childcareValue),
    };
  }
}

function createOtherExpense(answers: CaseFormAnswer[]): FinancialEntry {
  return {
    title: formHelpers.getFirstAnswerValueByTags(answers, ['description']) ?? '<okänd>',
    value: parseFloat(formHelpers.getFirstAnswerValueByTags(answers, ['amount']) as string),
  };
}

function getChildrenExpenses(answers: CaseFormAnswer[]): FinancialEntry[] {
  const relevantAnswers = formHelpers.filterByTags(answers, ['children']);
  const childcareExpense = getChildcareExpense(relevantAnswers);

  const groupedExpenses = groupAnswersByGroupTag(relevantAnswers);
  const otherExpenses = groupedExpenses.map(createOtherExpense);

  const consolidated = [childcareExpense, ...otherExpenses];

  return filterValid(consolidated);
}

function createExpenses(answers: CaseFormAnswer[]): Expenses {
  const relevantAnswers = formHelpers.filterByTags(answers, ['expenses']);
  return {
    housing: createHousingExpenses(relevantAnswers),
    children: getChildrenExpenses(relevantAnswers),
  } as Expenses;
}

export function createFinancials(answers: CaseFormAnswer[]): Financials {
  return {
    governmentAids: createGovernmentAids(answers),
    expenses: createExpenses(answers),
  } as Financials;
}
