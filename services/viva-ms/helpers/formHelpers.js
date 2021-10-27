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

function filterByFieldIdIncludes(answers, shouldInclude) {
  return answers.filter(answer => fieldIdIncludes(answer.field.id, shouldInclude));
}

function filterByTags(answers, tags) {
  return answers.filter(answer => answer.field.tags.includes(tags));
}

export default {
  getTagIfIncludes,
  fieldIdIncludes,
  getAttributeFromAnswerFieldId,
  filterByTags,
  filterByFieldIdIncludes,
};
