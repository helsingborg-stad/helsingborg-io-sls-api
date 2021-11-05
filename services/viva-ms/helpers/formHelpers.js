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
  let checkTags = tags;
  if (typeof tags === 'string') {
    checkTags = [tags];
  }
  return answers.filter(answer => checkTags.every(tag => answer.field.tags.includes(tag)));
}

export default {
  getTagIfIncludes,
  fieldIdIncludes,
  getAttributeFromAnswerFieldId,
  filterByTags,
  filterByFieldIdIncludes,
};
