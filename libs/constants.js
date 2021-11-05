export const NOT_STARTED = 'notStarted';
export const ACTIVE_ONGOING = 'active:ongoing';
export const ACTIVE_SIGNATURE_COMPLETED = 'active:signature:completed';
export const ACTIVE_SIGNATURE_PENDING = 'active:signature:pending';
export const ACTIVE_SUBMITTED = 'active:submitted';
export const ACTIVE_PROCESSING = 'active:processing';
export const CLOSED = 'closed';
export const NOT_STARTED_VIVA = 'notStarted:viva';
export const ACTIVE_COMPLETION_REQUIRED_VIVA = 'active:completionRequired:viva';
export const CLOSED_APPROVED_VIVA = 'closed:approved:viva';
export const CLOSED_PARTIALLY_APPROVED_VIVA = 'closed:partiallyApproved:viva';
export const CLOSED_REJECTED_VIVA = 'closed:rejected:viva';
export const CLOSED_COMPLETION_REJECTED_VIVA = 'closed:completionRejected:viva';

export const CASE_PROVIDER_VIVA = 'VIVA';
export const VIVA_CASE_CREATED = 'VIVA_CASE_CREATED';
export const VIVA_COMPLETION_REQUIRED = 'VIVA_COMPLETION_REQUIRED';

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
