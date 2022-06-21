import clone from 'lodash.clone';
import type { CaseFormAnswer, CaseFormAnswerValue, CasePersonRole } from '../../types/caseItem';
import { formatTimestampToDate } from '../formatPeriodDates';

type SharedTags =
  | 'amount'
  | 'changed'
  | 'children'
  | 'description'
  | 'expenses'
  | 'firstName'
  | 'housing'
  | 'incomes'
  | 'lastName'
  | 'personalNumber'
  | 'type';

type PersonTags =
  | 'akassa'
  | 'amount'
  | 'annat'
  | 'applicant'
  | 'citizenship'
  | 'coapplicant'
  | 'date'
  | 'date'
  | 'description'
  | 'email'
  | 'foreignPension'
  | 'lon'
  | 'medicin'
  | 'other'
  | 'phonenumber'
  | 'tandvard';

type OccupationTags =
  | 'date'
  | 'fulltime'
  | 'occupation'
  | 'otheroccupation'
  | 'parentalleave'
  | 'parttime'
  | 'sickleave'
  | 'studies'
  | 'unemployed';

type NoteTags = 'message';

type HousingTags =
  | 'address'
  | 'debtRent'
  | 'homelessDescription'
  | 'layout'
  | 'numberPeopleLiving'
  | 'otherLivingDescription'
  | 'ownerContractApproved'
  | 'ownRoom'
  | 'postalAddress'
  | 'postalCode'
  | 'rent'
  | 'value';

type ChildTags = 'school';

type FinancialTags =
  | 'aid'
  | 'assets'
  | 'boende'
  | 'childcare'
  | 'csn'
  | 'electricity'
  | 'fastighet'
  | 'fordon'
  | 'homeinsurance'
  | 'insurance'
  | 'internet'
  | 'övrig'
  | 'pension'
  | 'resident'
  | 'unemployment';

export type ValidTags =
  | SharedTags
  | PersonTags
  | OccupationTags
  | NoteTags
  | HousingTags
  | ChildTags
  | FinancialTags;

export interface Human {
  role: CasePersonRole;
  personalNumber: string;
  firstName: string;
  lastName: string;
}

export function groupAnswersByGroupTag(answers: CaseFormAnswer[]): CaseFormAnswer[][] {
  const extractRegex = /^group:.*:(\d+)$/;

  const groupedAnswers: CaseFormAnswer[][] = answers.reduce((acc, answer) => {
    const groupTag = answer.field.tags.find(tag => tag.startsWith('group:'));
    if (groupTag) {
      const match = groupTag.match(extractRegex);
      if (match) {
        const index = match[1];
        const accCopy = clone(acc);
        accCopy[index] = [...(accCopy[index] ?? []), answer];
        return accCopy;
      }
    }
    return acc;
  }, [] as CaseFormAnswer[][]);

  return groupedAnswers;
}

export function filterValid<T>(list: (T | undefined | null)[]): T[] {
  return list.filter(Boolean) as T[];
}

export function parseRelativeMonth(month: string): string {
  const monthRegex = /^month([-+]\d+)?$/;
  const match = month.match(monthRegex);
  const modifier = match?.[1];

  const thisDate = new Date();
  const thisMonth = thisDate.getMonth();

  if (modifier) {
    const value = parseInt(modifier.substring(1));
    const actualValue = modifier[0] === '-' ? -value : value;
    const newMonth = thisMonth + actualValue;
    const newDate = new Date();
    newDate.setMonth(newMonth);
    return newDate.toLocaleDateString('sv-se', { month: 'long' });
  }

  return thisDate.toLocaleDateString('sv-se', { month: 'long' });
}

export function filterCheckedTags(answers: CaseFormAnswer[], tags: ValidTags[]): ValidTags[] {
  return tags.filter(
    tag =>
      !!answers.find(answer => {
        const hasTag = answer.field.tags.includes(tag);
        const isChecked = answer.value === true;
        return hasTag && isChecked;
      })
  );
}

export function toDateString(maybeDateNumber?: CaseFormAnswerValue): string {
  if (typeof maybeDateNumber === 'number') {
    return formatTimestampToDate(maybeDateNumber);
  }
  return '';
}
