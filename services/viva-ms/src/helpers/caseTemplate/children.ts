import type { CaseFormAnswer } from '../../types/caseItem';
import { CasePersonRole } from '../../types/caseItem';
import * as formHelpers from '../formHelpers';
import type { Human } from './shared';
import { groupAnswersByGroupTag } from './shared';

export interface Child extends Human {
  housing: string;
  school: string;
}

function createChild(answers: CaseFormAnswer[]): Child {
  return {
    firstName: formHelpers.getFirstAnswerValueByTags(answers, ['firstName']) ?? '',
    lastName: formHelpers.getFirstAnswerValueByTags(answers, ['lastName']) ?? '',
    personalNumber: formHelpers.getFirstAnswerValueByTags(answers, ['personalNumber']) ?? '',
    housing: formHelpers.getFirstAnswerValueByTags(answers, ['housing']) ?? '',
    school: formHelpers.getFirstAnswerValueByTags(answers, ['school']) ?? '',
    role: CasePersonRole.Children,
  };
}

export function createChildren(answers: CaseFormAnswer[]): Child[] {
  const childAnswers = formHelpers.filterByTags(answers, ['children']);
  const groupedChildAnswers = groupAnswersByGroupTag(childAnswers);
  return groupedChildAnswers.map(createChild);
}
