/**
 * Checks if string is a numeric value
 * @param {string} str
 */
const isNumeric = (str: string): boolean => {
  if (typeof str !== 'string') return false;
  // eslint-disable-next-line no-restricted-globals
  return !isNaN(parseFloat(str));
};

/**
 * Converts case answers array to object.
 * @param {array} answerArray the flat array that we want to convert to a nested tree structure
 */
export const convertAnswerArrayToObject = (
  answerArray: { field: { id: string; tags: string[] }; value: string }[]
): Record<string, any> => {
  const caseObject: Record<string, any> = {};
  if (!Array.isArray(answerArray)) {
    return caseObject;
  }

  answerArray.forEach(answer => {
    const path = answer.field.id.split('.');
    path.reduce((prev, pathPart, i) => {
      if (!prev) {
        return undefined;
      }
      if (!prev[pathPart]) {
        if (i === path.length - 1) {
          prev[pathPart] = answer.value;
        } else if (isNumeric(path[i + 1])) {
          prev[pathPart] = [];
        } else {
          prev[pathPart] = {};
        }
      }

      return prev[pathPart];
    }, caseObject);
  });

  return caseObject;
};
