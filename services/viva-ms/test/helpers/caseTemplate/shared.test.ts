import {
  CommonValue,
  filterCheckedTags,
  filterValid,
  getMonthNameFromDate,
  mapToCommonValue,
  parseRelativeMonth,
  toDateString,
  ValidTags,
} from '../../../src/helpers/caseTemplate/shared';
import { CaseFormAnswer, CaseFormAnswerValue } from '../../../src/types/caseItem';

describe('Case Template - shared', () => {
  describe('groupAnswersByGroupTag', () => {
    //
  });

  describe('filterValid', () => {
    it('filters', () => {
      const expected = ['A', 'B', 'C'];
      const unfiltered = [undefined, ...expected, null, undefined, null];

      const filtered = filterValid(unfiltered);

      expect(filtered).toEqual(expected);
    });
  });

  describe('mapToCommonValue', () => {
    it('maps type,description,date,value', () => {
      const expected: Required<CommonValue> = {
        type: 'TYPE HERE',
        description: 'DESCRIPTION HERE',
        date: '2022-06-12',
        value: 1337,
      };

      const answers: CaseFormAnswer[] = [
        {
          field: { id: '', tags: ['type'] },
          value: expected.type,
        },
        {
          field: { id: '', tags: ['description'] },
          value: expected.description,
        },
        {
          field: { id: '', tags: ['date'] },
          value: 1655028000000,
        },
        {
          field: { id: '', tags: ['value'] },
          value: expected.value,
        },
        {
          field: { id: '', tags: ['annat'] },
          value: 'NOT INCLUDED',
        },
      ];

      const result = mapToCommonValue(answers);

      expect(result).toEqual(expected);
    });

    it.each<[string, CaseFormAnswer]>([
      [
        'value',
        {
          field: { id: '', tags: ['value'] },
          value: 1337,
        },
      ],
      [
        'amount',
        {
          field: { id: '', tags: ['amount'] },
          value: 1338,
        },
      ],
    ])('it maps %s to value', (_, answer) => {
      const expectedValue = answer.value;

      const result = mapToCommonValue([answer]);

      expect(result.value).toBe(expectedValue);
    });

    it('maps only first value it finds', () => {
      const expected: CommonValue = {
        type: 'A',
        value: 0,
      };

      const answers: CaseFormAnswer[] = [
        {
          field: { id: '', tags: ['type'] },
          value: 'A',
        },
        {
          field: { id: '', tags: ['type'] },
          value: 'B',
        },
        {
          field: { id: '', tags: ['value'] },
          value: 0,
        },
        {
          field: { id: '', tags: ['value'] },
          value: 404,
        },
      ];

      const result = mapToCommonValue(answers);

      expect(result).toEqual(expect.objectContaining(expected));
    });
  });

  describe('parseRelativeMonth', () => {
    function getDateWithMonthOffset(offset: number): Date {
      const newDate = new Date();
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    }

    it.each([
      ['month', getMonthNameFromDate(getDateWithMonthOffset(0))],
      ['month-1', getMonthNameFromDate(getDateWithMonthOffset(-1))],
      ['month+1', getMonthNameFromDate(getDateWithMonthOffset(1))],
      ['month+10', getMonthNameFromDate(getDateWithMonthOffset(10))],
      ['<invalid>', getMonthNameFromDate(getDateWithMonthOffset(0))],
      ['month+<invalid>', getMonthNameFromDate(getDateWithMonthOffset(0))],
    ])('parses %s as %s', (month, expected) => {
      const result = parseRelativeMonth(month);

      expect(result).toBe(expected);
    });
  });

  describe('filterCheckedTags', () => {
    it('filters', () => {
      const expected: ValidTags[] = ['unemployment', 'insurance', 'csn', 'pension'];
      const answers: CaseFormAnswer[] = [
        {
          field: { id: '', tags: ['unemployment'] },
          value: true,
        },
        {
          field: { id: '', tags: ['insurance'] },
          value: true,
        },
        {
          field: { id: '', tags: ['csn'] },
          value: true,
        },
        {
          field: { id: '', tags: ['pension'] },
          value: true,
        },
        {
          field: { id: '', tags: ['address'] },
          value: false,
        },
        {
          field: { id: '', tags: ['aid'] },
          value: 'invalid',
        },
        {
          field: { id: '', tags: ['akassa'] },
          value: 1234,
        },
      ];

      const result = filterCheckedTags(answers, expected);

      expect(result).toEqual(expected);
    });
  });

  describe('toDateString', () => {
    it.each(<[CaseFormAnswerValue, string][]>[
      [1655028000000, '2022-06-12'],
      [0, '1970-01-01'],
      ['invalid', ''],
      ['0', ''],
    ])('maps %s to "%s"', (maybeDateNumber, expected) => {
      const result = toDateString(maybeDateNumber);

      expect(result).toBe(expected);
    });
  });
});
