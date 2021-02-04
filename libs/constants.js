import { getStatusByType } from '../libs/caseStatuses';

export const CASE_ITEM_TYPE = 'CASE';
export const CASE_STATUS_ONGOING = getStatusByType('active:ongoing');
export const CASE_PROVIDER_VIVA = 'VIVA';
export const CASE_EXPIRATION_HOURS = 72;
