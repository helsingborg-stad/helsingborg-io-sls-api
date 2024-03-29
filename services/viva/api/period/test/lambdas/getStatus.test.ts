import dayjs from 'dayjs';
import type { Dependencies, Response, Input } from '../../src/lambdas/getStatus';
import { getStatus } from '../../src/lambdas/getStatus';

const MOCK_PERSONAL_NUMBER = '191212121212';
const MOCK_TIME = '2022-02-01T12:00:00Z';
const SWEDISH_MONTH_NAMES = [
  'januari',
  'februari',
  'mars',
  'april',
  'maj',
  'juni',
  'juli',
  'augusti',
  'september',
  'oktober',
  'november',
  'december',
];

const MOCK_PERIOD_OPEN_DATES = Array.from({ length: 12 }, (_, index) =>
  dayjs('2022-01-01T12:00:00Z').add(index, 'month').toISOString()
);

function createMockInput(personalNumber: string): Input {
  return {
    personalNumber,
  };
}

function createMockDependencies(
  periodOpenDate: string,
  responseMessageFormat?: string,
  providerPeriodInfo?: { start: string | null; end: string | null }
): Dependencies {
  return {
    getProviderPeriodInfo() {
      return Promise.resolve({
        start: dayjs(providerPeriodInfo?.start) ?? null,
        end: dayjs(providerPeriodInfo?.end) ?? null,
      });
    },
    isApplicantStatusEligible() {
      return Promise.resolve(true);
    },
    getConfig() {
      return Promise.resolve({
        responseMessageFormat:
          responseMessageFormat ?? 'nextMonth: {{ nextMonth }}, openDate: {{ openDate }}',
        monthlyOpenDates: Array(12).fill(periodOpenDate),
      });
    },
  };
}

describe('viva/period getStatus', () => {
  beforeAll(() => {
    const mockTimeMs = dayjs(MOCK_TIME).unix() * 1000;
    jest.useFakeTimers('modern').setSystemTime(mockTimeMs);
  });

  it.each([
    ['2022-02-02T12:00:01.000Z', 'nextMonth: mars, openDate: 2a februari'],
    ['2022-02-03T12:00:00.000Z', 'nextMonth: mars, openDate: 3e februari'],
  ])(
    'return correctly formatted message when before period open date',
    async (periodOpenDate, expectedMessage) => {
      const result = await getStatus(
        createMockInput(MOCK_PERSONAL_NUMBER),
        createMockDependencies(periodOpenDate, undefined, {
          start: '2022-01-01T00:00:00Z',
          end: '2022-01-31T00:00:00Z',
        })
      );
      expect(result.message).toBe(expectedMessage);
    }
  );

  it("return 'null' message when on/after period open date", async () => {
    const result = await getStatus(
      createMockInput(MOCK_PERSONAL_NUMBER),
      createMockDependencies('2023-02-01T00:00:00Z')
    );
    expect(result.message).toBeNull();
  });

  it.each(
    SWEDISH_MONTH_NAMES.map((monthName, index) => [
      monthName,
      dayjs('2022-01-01T12:00:00Z')
        .add(index - 1, 'month')
        .toISOString(),
    ])
  )("replaces correct nextMonth '%s' for '%s'", async (expectedMonth, mockDateString) => {
    const mockDateMs = dayjs(mockDateString).unix() * 1000;
    jest.useFakeTimers('modern').setSystemTime(mockDateMs);

    const result = await getStatus(
      createMockInput(MOCK_PERSONAL_NUMBER),
      createMockDependencies(dayjs().add(1, 'day').toISOString(), '{{ nextMonth }}', {
        start: '2021-01-01T12:00:00Z',
        end: '2021-01-31T12:00:00Z',
      })
    );

    expect(result.message).toBe(expectedMonth);
  });

  it('uses correct index of monthly open periods', async () => {
    const indexArray = Array.from({ length: 12 }, (_, i) => i);

    const results = await indexArray.reduce(async (lastResultPromise, index) => {
      const accumulatedResponses = await lastResultPromise;
      const slightlyBeforeMockDate = dayjs(MOCK_PERIOD_OPEN_DATES[index]).subtract(1, 'h');
      jest.setSystemTime(slightlyBeforeMockDate.unix() * 1000);

      const result = await getStatus(createMockInput(MOCK_PERSONAL_NUMBER), {
        getProviderPeriodInfo() {
          return Promise.resolve({
            start: dayjs('2021-01-01T12:00:00Z'),
            end: dayjs('2021-01-31T12:00:00Z'),
          });
        },
        isApplicantStatusEligible() {
          return Promise.resolve(true);
        },
        getConfig() {
          return Promise.resolve({
            responseMessageFormat: '{{ openDate }}',
            monthlyOpenDates: MOCK_PERIOD_OPEN_DATES,
          });
        },
      });

      return [...accumulatedResponses, result];
    }, Promise.resolve([] as Response[]));

    const messages = results.map(result => result.message);
    const expectedDates = MOCK_PERIOD_OPEN_DATES.map(dateString =>
      dayjs(dateString).locale('sv').format('Do MMMM')
    );

    expect(messages).toEqual(expectedDates);
  });

  it('returns null when period is closed in config but applicant is eligible to apply', async () => {
    const result = await getStatus(
      createMockInput(MOCK_PERSONAL_NUMBER),
      createMockDependencies(
        '2022-01-01T2:00:00Z',
        'nextMonth: {{ nextMonth }}, openDate: {{ openDate }}',
        { start: null, end: null }
      )
    );
    expect(result.message).toBeNull();
  });

  it('returns message when period is closed in config and applicant is NOT eligible to apply', async () => {
    const result = await getStatus(createMockInput(MOCK_PERSONAL_NUMBER), {
      getProviderPeriodInfo() {
        return Promise.resolve({ start: null, end: null });
      },
      isApplicantStatusEligible() {
        return Promise.resolve(false);
      },
      getConfig() {
        return Promise.resolve({
          responseMessageFormat: 'nextMonth: {{ nextMonth }}, openDate: {{ openDate }}',
          monthlyOpenDates: MOCK_PERIOD_OPEN_DATES,
        });
      },
    });

    expect(result.message).toBe('nextMonth: januari, openDate: 1a december');
  });
});
