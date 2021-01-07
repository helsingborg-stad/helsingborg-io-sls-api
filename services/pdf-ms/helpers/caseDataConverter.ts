const isNumeric = (str: string | number): boolean => {
  if (typeof str === 'number') return true;
  if (typeof str !== 'string') return false;
  // eslint-disable-next-line no-restricted-globals
  return !isNaN(parseFloat(str));
};

/**
 * Converts an array of objects with { field: {id}, value} to a nested json structure.
 * The ids are dotted strings, like "personal.name", and this is mapped to the
 * corresponding json { personal: {name}}, etc.
 */
export const arrayToObject = (
  array: { field: { id: string; tags: string[] }; value: string }[]
): Record<string, any> => {
  const object: Record<string, any> = {};
  if (!Array.isArray(array)) {
    return object;
  }

  array.forEach(answer => {
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
    }, object);
  });

  return object;
};
