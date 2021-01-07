/**
 * Extracts a value from json, specified by the dotted string specifying the name.
 * For example, from the json {info: {value: 2}}, with the string "info.value", this
 * should return 2, whereas with the string "info", it should return {value: 2}.
 * Any property that does not exist on the object returns undefined.
 * @param obj
 * @param dottedString
 */
export function getPropertyFromDottedString(obj: Record<string, any>, dottedString: string): any {
  const path = dottedString.split('.');
  const [property] = path.reduce(
    (prev: any, current: string) => {
      if (!prev[0] && !prev[1]) return [undefined, false];
      if (!prev[0] && prev[1] && obj[current]) return [obj[current], true];
      if (prev[0] && prev[1] && prev[0][current]) return [prev[0][current], true];
      if (prev[0] && prev[1] && !prev[0][current]) return [undefined, false];
      return [undefined, true];
    },
    [undefined, true]
  );
  return property;
}
