import {
  asBooleanSafe,
  fromYesNoBoolean,
  parseFloatSafe,
  filterCheckedTags,
  filterValid,
  getMonthNameFromDate,
  groupAnswersByGroupTag,
  mapToCommonValue,
  parseRelativeMonth,
  toDateString,
} from '../../../src/helpers/caseTemplate/shared';
import { makeAnswer } from './testHelpers';

import type { CommonValue, ValidTags } from '../../../src/helpers/caseTemplate/shared';
import type { CaseFormAnswer, CaseFormAnswerValue } from '../../../src/types/caseItem';

describe('Case Template - shared', () => {
  describe('groupAnswersByGroupTag', () => {
    it('groups answers', () => {
      const firstGroupAnswers: CaseFormAnswer[] = [
        makeAnswer('group:test:0', 1337),
        makeAnswer('group:test2:0', 'Hello'),
        makeAnswer('group:test3:0', true),
      ];
      const secondGroupAnswers: CaseFormAnswer[] = [
        makeAnswer('group:test:1', 1234),
        makeAnswer('group:test2:1', 'World'),
        makeAnswer('group:test3:1', false),
      ];
      const allAnswers = [...firstGroupAnswers, ...secondGroupAnswers];

      const result = groupAnswersByGroupTag(allAnswers);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.arrayContaining(firstGroupAnswers));
      expect(result[0]).toHaveLength(firstGroupAnswers.length);
      expect(result[1]).toEqual(expect.arrayContaining(secondGroupAnswers));
      expect(result[1]).toHaveLength(secondGroupAnswers.length);
    });

    it('ignores non-group answers', () => {
      const ignoredAnswer = makeAnswer('aid', 'ignore this');
      const answers: CaseFormAnswer[] = [
        makeAnswer('group:test:0', 1337),
        makeAnswer('group:test2:0', 'Hello'),
        makeAnswer('group:test3:0', true),
        ignoredAnswer,
      ];

      const result = groupAnswersByGroupTag(answers);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(answers.length - 1);
      expect(result).not.toContain(ignoredAnswer);
    });

    it('handles out-of-order/missing indices', () => {
      const firstGroupAnswers: CaseFormAnswer[] = [
        makeAnswer('group:test:5', 1337),
        makeAnswer('group:test2:5', 'Hello'),
        makeAnswer('group:test3:5', true),
      ];
      const secondGroupAnswers: CaseFormAnswer[] = [
        makeAnswer('group:test:3', 1234),
        makeAnswer('group:test2:3', 'World'),
        makeAnswer('group:test3:3', false),
      ];
      const allAnswers = [...firstGroupAnswers, ...secondGroupAnswers];

      const result = groupAnswersByGroupTag(allAnswers);

      expect(result).toHaveLength(6);
      expect(result[5]).toEqual(expect.arrayContaining(firstGroupAnswers));
      expect(result[5]).toHaveLength(firstGroupAnswers.length);
      expect(result[3]).toEqual(expect.arrayContaining(secondGroupAnswers));
      expect(result[3]).toHaveLength(secondGroupAnswers.length);
    });
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
        makeAnswer('type', expected.type),
        makeAnswer('description', expected.description),
        makeAnswer('date', 1655028000000),
        makeAnswer('value', expected.value),
        makeAnswer('annat', 'NOT INCLUDED'),
      ];

      const result = mapToCommonValue(answers);

      expect(result).toEqual(expected);
    });

    it.each<[string, CaseFormAnswer]>([
      ['value', makeAnswer('value', 1337)],
      ['amount', makeAnswer('amount', 1338)],
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
        makeAnswer('type', 'A'),
        makeAnswer('type', 'B'),
        makeAnswer('value', 0),
        makeAnswer('value', 404),
      ];

      const result = mapToCommonValue(answers);

      expect(result).toEqual(expect.objectContaining(expected));
    });
  });

  describe('getMonthNameFromDate', () => {
    it('gets (Swedish) month name', () => {
      const date = new Date(1199142000);

      const monthName = getMonthNameFromDate(date, 'sv-se');

      expect(monthName).toBe('januari');
    });
  });

  describe('parseRelativeMonth', () => {
    function getDateWithMonthOffset(offset: number): Date {
      const newDate = new Date(1655028000000);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    }

    it.each([
      [
        'month',
        getDateWithMonthOffset(0),
        getMonthNameFromDate(getDateWithMonthOffset(0), 'sv-se'),
      ],
      [
        'month-1',
        getDateWithMonthOffset(0),
        getMonthNameFromDate(getDateWithMonthOffset(-1), 'sv-se'),
      ],
      [
        'month+1',
        getDateWithMonthOffset(0),
        getMonthNameFromDate(getDateWithMonthOffset(1), 'sv-se'),
      ],
      [
        'month+10',
        getDateWithMonthOffset(0),
        getMonthNameFromDate(getDateWithMonthOffset(10), 'sv-se'),
      ],
      [
        '<invalid>',
        getDateWithMonthOffset(0),
        getMonthNameFromDate(getDateWithMonthOffset(0), 'sv-se'),
      ],
      [
        'month+<invalid>',
        getDateWithMonthOffset(0),
        getMonthNameFromDate(getDateWithMonthOffset(0), 'sv-se'),
      ],
      ['month-1', new Date(1659218400000), 'juni'],
    ])('parses %s %s as %s', (month, relativeDate, expected) => {
      const result = parseRelativeMonth(month, relativeDate);

      expect(result).toBe(expected);
    });
  });

  describe('filterCheckedTags', () => {
    it('filters', () => {
      const expected: ValidTags[] = ['unemployment', 'insurance', 'csn', 'pension'];
      const answers: CaseFormAnswer[] = [
        makeAnswer('unemployment', true),
        makeAnswer('insurance', true),
        makeAnswer('csn', true),
        makeAnswer('pension', true),
        makeAnswer('address', false),
        makeAnswer('aid', 'invalid'),
        makeAnswer('akassa', 1234),
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

  describe('parseFloatSafe', () => {
    it.each([
      ['12.34', 12.34],
      [13.37, 13.37],
      ['invalid', undefined],
      [undefined, undefined],
      [null, undefined],
      [true, undefined],
    ])('for %s returns %s', (input, expected) => {
      const result = parseFloatSafe(input as string);
      expect(result).toBe(expected);
    });
  });

  describe('asBooleanSafe', () => {
    it.each([
      [true, true],
      [false, false],
      [undefined, undefined],
      [null, false],
      ['abc', true],
      ['', false],
    ])('for %s returns %s', (input, expected) => {
      const result = asBooleanSafe(input);
      expect(result).toBe(expected);
    });
  });

  describe('fromYesNoBoolean', () => {
    it.each([
      ['ja', true],
      ['JA', true],
      ['jA', true],
      ['nej', false],
      ['NEJ', false],
      ['nEj', false],
      [undefined, undefined],
      [1, false],
      [null, false],
    ])('for %s returns %s', (input, expected) => {
      const result = fromYesNoBoolean(input as string);
      expect(result).toBe(expected);
    });
  });
});
