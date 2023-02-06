import dayjs from 'dayjs';
import {
  getCurrentPeriodInfo,
  getSafe,
  formatHandlebarsDateMessage,
} from '../../../../microservice/src/helpers/vivaPeriod';

import type { PeriodConfig } from '../../../../microservice/src/helpers/vivaPeriod';

const MOCK_ISO = '2023-02-06T12:00:00Z';
const MOCK_DATE = dayjs(MOCK_ISO);

describe('vivaPeriod', () => {
  describe('getSafe', () => {
    it('returns element if it exists', () => {
      const MOCK_LIST = ['a', 'b', 'c', 'd'];

      const result = getSafe(MOCK_LIST, 2);

      expect(result).toBe('c');
    });

    it('throws on missing element', () => {
      const MOCK_LIST = ['a', 'b', 'c', 'd'];

      function func() {
        return getSafe(MOCK_LIST, 4);
      }

      expect(func).toThrow('Invalid index 4 for list: a, b, c, d');
    });
  });

  describe('formatHandlebarsDateMessage', () => {
    it.each([
      ['{{ nextMonth }}', 'mars'],
      ['{{ openDate }}', '7e februari'],
    ])('replaces %s with %s', (templateInput, expected) => {
      const periodOpenDate = dayjs(MOCK_DATE.unix() * 1000).add(1, 'day');

      const result = formatHandlebarsDateMessage(templateInput, {
        currentDate: MOCK_DATE,
        periodOpenDate,
      });

      expect(result).toBe(expected);
    });
  });

  describe('getCurrentPeriodInfo', () => {
    it('returns correct info for a closed period', () => {
      jest.useFakeTimers('modern').setSystemTime(MOCK_DATE.unix() * 1000);
      const MOCK_OPEN_ISO = '2023-02-08T12:00:00.000Z';

      const MOCK_CONFIG: PeriodConfig = {
        monthlyOpenDates: ['', MOCK_OPEN_ISO],
        responseMessageFormat: '',
      };

      const result = getCurrentPeriodInfo(MOCK_CONFIG);

      expect(result.currentDate.unix()).toBe(dayjs().unix());
      expect(result.periodOpenDate.toISOString()).toBe(MOCK_OPEN_ISO);
      expect(result.isPeriodOpen).toBe(false);
    });

    it('returns correct info for an open period', () => {
      jest.useFakeTimers('modern').setSystemTime(MOCK_DATE.unix() * 1000);
      const MOCK_OPEN_ISO = '2023-02-03T12:00:00.000Z';

      const MOCK_CONFIG: PeriodConfig = {
        monthlyOpenDates: ['', MOCK_OPEN_ISO],
        responseMessageFormat: '',
      };

      const result = getCurrentPeriodInfo(MOCK_CONFIG);

      expect(result.currentDate.unix()).toBe(dayjs().unix());
      expect(result.periodOpenDate.toISOString()).toBe(MOCK_OPEN_ISO);
      expect(result.isPeriodOpen).toBe(true);
    });
  });
});
