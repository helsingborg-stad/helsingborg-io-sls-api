import type { FinancialEntry } from '../../../src/helpers/caseTemplate/financials';
import { makeFinancialEntryIfValid } from '../../../src/helpers/caseTemplate/financials';
import type { CaseFormAnswerValue } from '../../../src/types/caseItem';

describe('Case Template - financials', () => {
  describe('makeFinancialEntryIfValid', () => {
    it.each(<[string, CaseFormAnswerValue | undefined, FinancialEntry | undefined][]>[
      ['title', 1337, { title: 'title', value: 1337 }],
      ['title', undefined, undefined],
    ])('maps %s, %s to %s', (title, value, expected) => {
      const result = makeFinancialEntryIfValid(title, value);

      expect(result).toEqual(expected);
    });
  });
});
