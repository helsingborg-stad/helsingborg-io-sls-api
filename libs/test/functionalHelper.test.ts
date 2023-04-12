import { filterAsync, isValid, mapAsync } from '../functionalHelper';

function waitFor(seconds: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * 1000);
  });
}

describe('functional helpers', () => {
  it.each([
    [null, false],
    [undefined, false],
    [0, false],
    [false, false],
    ['', false],
    [' ', true],
    [{}, true],
    [1, true],
    [true, true],
  ])("isValid '%s' equals %s", (value, expected) => {
    const result = isValid(value);
    expect(result).toBe(expected);
  });

  test('filterAsync', async () => {
    const arr = [true, true, false, false, true, false];

    const filtered = await filterAsync(arr, async value => {
      await waitFor(0.1);
      return value;
    });

    expect(filtered).toEqual([true, true, true]);
  });

  test('mapAsync', async () => {
    async function mapThing(value: string): Promise<number> {
      await waitFor(0.1);
      return parseInt(value);
    }

    const sourceValues = ['1', '42', '-13', '37'];
    const expected = [1, 42, -13, 37];

    const result = await mapAsync(sourceValues, mapThing);

    expect(result).toEqual(expected);
  });
});
