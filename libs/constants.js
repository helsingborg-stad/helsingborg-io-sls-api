import { getStatusByType } from '../libs/caseStatuses';

export const CASE_ITEM_TYPE = 'CASE';
export const CASE_STATUS_ONGOING = getStatusByType('active:ongoing');
export const CASE_PROVIDER_VIVA = 'VIVA';
export const DELETE_VIVA_CASE_AFTER_45_DAYS = 1080; // 45 days * 24 hours = 1080 hours
export const DELETE_VIVA_CASE_AFTER_72_HOURS = 72;
