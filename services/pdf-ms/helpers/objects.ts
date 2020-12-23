export function getPropertyFromDottedString(obj: Record<string, any>, dottedString: string): any {
  const strArr = dottedString.split('.');
  const [res] = strArr.reduce(
    (prev: any, current: string) => {
      if (!prev[0] && !prev[1]) return [undefined, false];
      if (!prev[0] && prev[1] && obj[current]) return [obj[current], true];
      if (prev[0] && prev[1] && prev[0][current]) return [prev[0][current], true];
      if (prev[0] && prev[1] && !prev[0][current]) return [undefined, false];
      return [undefined, true];
    },
    [undefined, true]
  );
  return res;
}
