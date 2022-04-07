import caseExpiry from '../../src/helpers/caseExpiryTime';

import {
  ACTIVE_ONGOING,
  ACTIVE_ONGOING_NEW_APPLICATION,
  ACTIVE_SIGNATURE_PENDING,
  ACTIVE_SIGNATURE_COMPLETED,
  ACTIVE_SUBMITTED,
  ACTIVE_PROCESSING,
  ACTIVE_COMPLETION_ONGOING,
  ACTIVE_RANDOM_CHECK_ONGOING,
  ACTIVE_COMPLETION_SUBMITTED,
  ACTIVE_RANDOM_CHECK_SUBMITTED,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  CLOSED_APPROVED_VIVA,
  CLOSED_PARTIALLY_APPROVED_VIVA,
  CLOSED_REJECTED_VIVA,
  CLOSED_COMPLETION_REJECTED_VIVA,
  SIX_MONTHS_IN_HOURS,
  FORTY_FIVE_DAYS_IN_HOURS,
  SEVENTY_TWO_HOURS,
} from '../../src/libs/constants';

it.each([
  {
    input: ACTIVE_ONGOING,
    expectedResult: SEVENTY_TWO_HOURS,
  },
  {
    input: ACTIVE_ONGOING_NEW_APPLICATION,
    expectedResult: SEVENTY_TWO_HOURS,
  },
  {
    input: ACTIVE_SIGNATURE_PENDING,
    expectedResult: FORTY_FIVE_DAYS_IN_HOURS,
  },
  {
    input: ACTIVE_SIGNATURE_COMPLETED,
    expectedResult: FORTY_FIVE_DAYS_IN_HOURS,
  },

  {
    input: ACTIVE_SUBMITTED,
    expectedResult: FORTY_FIVE_DAYS_IN_HOURS,
  },
  {
    input: ACTIVE_PROCESSING,
    expectedResult: FORTY_FIVE_DAYS_IN_HOURS,
  },

  {
    input: ACTIVE_COMPLETION_SUBMITTED,
    expectedResult: FORTY_FIVE_DAYS_IN_HOURS,
  },
  {
    input: ACTIVE_RANDOM_CHECK_SUBMITTED,
    expectedResult: FORTY_FIVE_DAYS_IN_HOURS,
  },

  {
    input: ACTIVE_COMPLETION_ONGOING,
    expectedResult: FORTY_FIVE_DAYS_IN_HOURS,
  },
  {
    input: ACTIVE_RANDOM_CHECK_ONGOING,
    expectedResult: FORTY_FIVE_DAYS_IN_HOURS,
  },

  {
    input: ACTIVE_COMPLETION_REQUIRED_VIVA,
    expectedResult: FORTY_FIVE_DAYS_IN_HOURS,
  },
  {
    input: ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
    expectedResult: FORTY_FIVE_DAYS_IN_HOURS,
  },

  {
    input: CLOSED_APPROVED_VIVA,
    expectedResult: SIX_MONTHS_IN_HOURS,
  },
  {
    input: CLOSED_PARTIALLY_APPROVED_VIVA,
    expectedResult: SIX_MONTHS_IN_HOURS,
  },
  {
    input: CLOSED_REJECTED_VIVA,
    expectedResult: SIX_MONTHS_IN_HOURS,
  },
  {
    input: CLOSED_COMPLETION_REJECTED_VIVA,
    expectedResult: SIX_MONTHS_IN_HOURS,
  },
])('Returns $expectedResult for status type $input', ({ input, expectedResult }) => {
  const result = caseExpiry.getHoursOnStatusType(input);
  expect(result).toBe(expectedResult);
});

it('throws if status type not found in map', () => {
  const noneExistingStatusType = 'None existing type';

  expect(() => caseExpiry.getHoursOnStatusType(noneExistingStatusType)).toThrow(
    `Expiry time not set for status: ${noneExistingStatusType}`
  );
});
