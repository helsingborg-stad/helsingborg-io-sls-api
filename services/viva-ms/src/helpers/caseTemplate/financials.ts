import type { CaseFormAnswer, CaseFormAnswerValue } from '../../types/caseItem';
import * as formHelpers from '../formHelpers';
import type { ValidTags } from './shared';
import {
  filterCheckedTags,
  filterValid,
  groupAnswersByGroupTag,
  parseRelativeMonth,
} from './shared';

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

enum ValidHousingCategories {
  boende = 'boende',
  electricity = 'electricity',
  homeinsurance = 'homeinsurance',
  internet = 'internet',
}

const friendlyHousingCategoryNames: Record<ValidHousingCategories, string> = {
  boende: 'Hyra/avgift',
  electricity: 'El',
  homeinsurance: 'Hemförsäkring',
  internet: 'Internet/bredband',
};

function createGovernmentAids(answers: CaseFormAnswer[]): string[] {
  const aidAnswers = formHelpers.filterByTags(answers, ['aid']);
  const validAids = Object.values(ValidAids) as ValidTags[];

  const checkedAids = filterCheckedTags(aidAnswers, validAids);
  const friendlyNames = checkedAids.map(aidTag => friendlyAidNames[aidTag as ValidAids]);
  return friendlyNames;
}

function makeHousingEntryTitle(category: string, answer: CaseFormAnswer): string {
  const categoryTitle = friendlyHousingCategoryNames[category as ValidHousingCategories];
  const monthTag = answer.field.tags.filter(tag => tag.startsWith('month'))[0];

  if (monthTag) {
    const monthName = parseRelativeMonth(monthTag);
    return `${categoryTitle} ${monthName}`;
  }
  return categoryTitle;
}

function reduceAnswersByHousingCategories(
  residentIncomeAnswers: CaseFormAnswer[]
): FinancialEntry[] {
  const categories = Object.values(ValidHousingCategories) as ValidTags[];

  const answersGroupedByCategory = categories.map(category => ({
    category,
    answers: formHelpers.filterByTags(residentIncomeAnswers, [category]),
  }));

  const financialEntries = answersGroupedByCategory.reduce((acc, categoryAnswers) => {
    const entries: FinancialEntry[] = categoryAnswers.answers.map(answer => ({
      title: makeHousingEntryTitle(categoryAnswers.category, answer),
      value: parseFloat(answer.value as string),
    }));
    return [...acc, ...entries];
  }, [] as FinancialEntry[]);

  return financialEntries;
}

function createHousingExpenses(answers: CaseFormAnswer[]): FinancialEntry[] {
  return reduceAnswersByHousingCategories(answers);
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
  };
}

function getResidentIncomes(answers: CaseFormAnswer[]): FinancialEntry[] {
  const residentIncomeAnswers = formHelpers.filterByTags(answers, ['incomes', 'resident']);

  return reduceAnswersByHousingCategories(residentIncomeAnswers);
}

export function makeFinancialEntryIfValid(
  title: string,
  value: CaseFormAnswerValue | undefined
): FinancialEntry | undefined {
  return value
    ? {
        title,
        value: parseFloat(value as string),
      }
    : undefined;
}

function mapOtherAsset(answers: CaseFormAnswer[]): FinancialEntry {
  return {
    title: formHelpers.getFirstAnswerValueByTags(answers, ['description']) ?? 'Övrig tillgång',
    value: parseFloat(formHelpers.getFirstAnswerValueByTags(answers, ['amount']) as string),
  };
}

function getAssets(answers: CaseFormAnswer[]): FinancialEntry[] {
  const relevantAnswers = formHelpers.filterByTags(answers, ['assets']);
  const vehicleAssetValue = formHelpers.getFirstAnswerValueByTags(relevantAnswers, [
    'fordon',
    'amount',
  ]);
  const housingAssetValue = formHelpers.getFirstAnswerValueByTags(relevantAnswers, [
    'fastighet',
    'amount',
  ]);

  const otherAssetAnswers = formHelpers.filterByTags(relevantAnswers, ['övrig']);
  const groupedOtherAssetAnswers = groupAnswersByGroupTag(otherAssetAnswers);

  const consolidated = [
    makeFinancialEntryIfValid('Fordon', vehicleAssetValue),
    makeFinancialEntryIfValid('Eget hus, lägenhet eller fastighet', housingAssetValue),
    ...groupedOtherAssetAnswers.map(mapOtherAsset),
  ];

  return filterValid(consolidated);
}

export function createFinancials(answers: CaseFormAnswer[]): Financials {
  return {
    governmentAids: createGovernmentAids(answers),
    expenses: createExpenses(answers),
    residentIncomes: getResidentIncomes(answers),
    assets: getAssets(answers),
  } as Financials;
}
