import { getStatusByType } from '../libs/caseStatuses';

export const CASE_ITEM_TYPE = 'CASE';
export const CASE_STATUS_ONGOING = getStatusByType('active:ongoing');
export const CASE_PROVIDER_VIVA = 'VIVA';

/**
 * A month is 1/12th of a year. In the Gregorian calendar, an average month has exactly 30.436875 days.
 * It was originally based on the time it takes for the moon to rotate the Earth.
 *
 * 6 Months = 4,382.90639 Hours
 * (exact result according to google)
 */
export const DELETE_VIVA_CASE_AFTER_6_MONTH = 4382;
export const DELETE_VIVA_CASE_AFTER_45_DAYS = 1080; // 45 days * 24 hours = 1080 hours
export const DELETE_VIVA_CASE_AFTER_72_HOURS = 72;
export const DELETE_VIVA_CASE_AFTER_12_HOURS = 12;
