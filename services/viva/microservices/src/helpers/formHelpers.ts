import type { CaseFormAnswer, CaseFormAnswerValue } from '../types/caseItem';
import type { ValidTags } from './caseTemplate/shared';

export function getTagIfIncludes(tags: ValidTags[], string: string): ValidTags | undefined {
  return tags.find(tag => tag.includes(string));
}

export function fieldIdIncludes(fieldId: string, string: string): boolean {
  return fieldId.includes(string);
}

export function getAttributeFromAnswerFieldId(fieldId: string): string {
  const splittedId = fieldId.split('.');
  const attribute = splittedId[splittedId.length - 1];
  return attribute;
}

export function getAttributeFromDotNotation(source: string, position: 1): string {
  const attributes = source.split('.');
  return attributes[position];
}

export function filterByFieldIdIncludes(
  answers: CaseFormAnswer[],
  shouldInclude: string
): CaseFormAnswer[] {
  return answers.filter(answer => fieldIdIncludes(answer.field.id, shouldInclude));
}

export function filterByTags(
  answers: CaseFormAnswer[],
  tags: ValidTags | ValidTags[]
): CaseFormAnswer[] {
  const tagsArray = Array.isArray(tags) ? tags : [tags];
  return answers.filter(answer => tagsArray.every(tag => answer.field.tags.includes(tag)));
}

export function getFirstAnswerValueByTags<T extends CaseFormAnswerValue>(
  answers: CaseFormAnswer[],
  tags: ValidTags[]
): T | undefined {
  const answer = answers.find(answer => tags.every(tag => answer.field.tags.includes(tag)));
  return answer?.value as T;
}
