import type { CaseFormAnswer, CaseFormAnswerValue } from '../types/caseItem';
import type { ValidTags } from './caseTemplate/shared';

function getTagIfIncludes(tags, string) {
  return tags.find(tag => tag.includes(string));
}

function fieldIdIncludes(fieldId, string) {
  return fieldId.includes(string);
}

function getAttributeFromAnswerFieldId(fieldId) {
  const splittedId = fieldId.split('.');
  const attribute = splittedId[splittedId.length - 1];
  return attribute;
}

function getAttributeFromDotNotation(source, position) {
  const attributes = source.split('.');
  return attributes[position];
}

function filterByFieldIdIncludes(answers: CaseFormAnswer[], shouldInclude: string) {
  return answers.filter(answer => fieldIdIncludes(answer.field.id, shouldInclude));
}

function filterByTags(answers: CaseFormAnswer[], tags: ValidTags | ValidTags[]): CaseFormAnswer[] {
  const tagsArray = Array.isArray(tags) ? tags : [tags];
  return answers.filter(answer => tagsArray.every(tag => answer.field.tags.includes(tag)));
}

function getFirstAnswerValueByTags<T extends CaseFormAnswerValue>(
  answers: CaseFormAnswer[],
  tags: ValidTags[]
): T | undefined {
  const answer = answers.find(answer => tags.every(tag => answer.field.tags.includes(tag)));
  return answer?.value as T;
}

export default {
  getTagIfIncludes,
  fieldIdIncludes,
  getAttributeFromAnswerFieldId,
  getAttributeFromDotNotation,
  filterByTags,
  filterByFieldIdIncludes,
  getFirstAnswerValueByTags,
};
