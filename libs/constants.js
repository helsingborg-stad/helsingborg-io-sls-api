export const NEW_APPLICATION = 'new:application';
export const NOT_STARTED = 'notStarted';
export const ACTIVE_ONGOING = 'active:ongoing';
export const ACTIVE_SIGNATURE_COMPLETED = 'active:signature:completed';
export const ACTIVE_SIGNATURE_PENDING = 'active:signature:pending';
export const ACTIVE_SUBMITTED = 'active:submitted';
export const ACTIVE_PROCESSING = 'active:processing';
export const CLOSED = 'closed';

export const ACTIVE_COMPLETION_REQUIRED = 'active:completionRequired';
export const ACTIVE_RANDOM_CHECK_REQUIRED = 'active:randomCheckRequired';

export const ACTIVE_COMPLETION_ONGOING = 'active:ongoing:completion';
export const ACTIVE_RANDOM_CHECK_ONGOING = 'active:ongoing:randomCheck';

export const ACTIVE_COMPLETION_SUBMITTED = 'active:submitted:completion';
export const ACTIVE_RANDOM_CHECK_SUBMITTED = 'active:submitted:randomCheck';

export const CASE_CREATED = 'CASE_CREATED';
export const CASE_HTML_GENERATED = 'CASE_HTML_GENERATED';
export const PDF_GENERATED = 'PDF_GENERATED';
export const PDF_NOT_GENERATED = 'PDF_NOT_GENERATED';

export const COMPLETIONS_REQUIRED = 'COMPLETIONS_REQUIRED';
export const COMPLETIONS_PENDING = 'COMPLETIONS_PENDING';
export const COMPLETIONS_DUE_DATE_PASSED = 'COMPLETIONS_DUE_DATE_PASSED';

export const CASE_PROVIDER_VIVA = 'VIVA';

/**
 * Service: Ekonomiskt bistånd
 */

// Case status type
export const NEW_APPLICATION_VIVA = 'new:application:viva';
export const NOT_STARTED_VIVA = 'notStarted:viva';
export const ACTIVE_COMPLETION_REQUIRED_VIVA = 'active:completionRequired:viva';
export const ACTIVE_RANDOM_CHECK_REQUIRED_VIVA = 'active:randomCheckRequired:viva';
export const CLOSED_APPROVED_VIVA = 'closed:approved:viva';
export const CLOSED_PARTIALLY_APPROVED_VIVA = 'closed:partiallyApproved:viva';
export const CLOSED_REJECTED_VIVA = 'closed:rejected:viva';
export const CLOSED_COMPLETION_REJECTED_VIVA = 'closed:completionRejected:viva';
export const CLOSED_RANDOM_CHECK_REJECTED_VIVA = 'closed:randomCheckRejected:viva';

// Case state
export const VIVA_CASE_CREATED = 'VIVA_CASE_CREATED';
export const VIVA_APPLICATION_RECEIVED = 'VIVA_APPLICATION_RECEIVED';
export const VIVA_COMPLETION_RECEIVED = 'VIVA_COMPLETION_RECEIVED';
export const VIVA_RANDOM_CHECK_RECEIVED = 'VIVA_RANDOM_CHECK_RECEIVED';

/**
 * A month is 1/12th of a year. In the Gregorian calendar, an average month has exactly 30.436875 days.
 * It was originally based on the time it takes for the moon to rotate the Earth.
 *
 * 6 Months = 4,382.90639 Hours
 * (exact result according to google)
 */
export const SIX_MONTHS_IN_HOURS = 4382;

export const FORTY_FIVE_DAYS_IN_HOURS = 1080;
export const SEVENTY_TWO_HOURS = 72;
export const TWELVE_HOURS = 12;
