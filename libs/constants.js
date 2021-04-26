import { getStatusByType } from '../libs/caseStatuses';

export const CASE_ITEM_TYPE = 'CASE';
export const CASE_STATUS_ONGOING = getStatusByType('active:ongoing');
export const CASE_PROVIDER_VIVA = 'VIVA';
export const CASE_SUBMITTED_EXPIRATION_HOURS = 1080; // 45 days * 24 hours = 1080 hours
export const CASE_ONGOING_EXPIRATION_HOURS = 72;
