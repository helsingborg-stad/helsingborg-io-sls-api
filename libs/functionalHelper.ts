export function isValid<T>(input: T | null | undefined): input is T {
  return !!input;
}

export function filterAsync<T>(
  data: T[],
  predicate: (value: T, index: number, array: T[]) => Promise<boolean>
): Promise<T[]> {
  // eslint-disable-next-line max-params
  return data.reduce(async (pendingValues, value, index, array) => {
    const values = await pendingValues;
    const shouldInclude = await predicate(value, index, array);
    const newValues = shouldInclude ? [...values, value] : values;
    return newValues;
  }, Promise.resolve([] as T[]));
}

export async function mapAsync<T, U>(
  data: T[],
  mapper: (value: T, index: number, array: T[]) => Promise<U>
): Promise<U[]> {
  const mappedValues = await Promise.all(data.map(mapper));
  return mappedValues;
}
