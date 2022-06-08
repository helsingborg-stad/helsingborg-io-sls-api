import type { CaseFormAnswer, CaseFormAnswerValue, ValidTags } from '../types/caseItem';

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

function filterByTags(answers: CaseFormAnswer[], tags: ValidTags[]): CaseFormAnswer[] {
  return answers.filter(answer => tags.every(tag => answer.field.tags.includes(tag)));
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
