import to from 'await-to-js';

import log from '../libs/logs';

import {
  VIVA_STATUS_APPLICATION_PERIOD_OPEN,
  VIVA_STATUS_CASE_EXISTS,
  VIVA_STATUS_WEB_APPLICATION_ACTIVE,
  VIVA_STATUS_WEB_APPLICATION_ALLOWED,
} from '../helpers/constants';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

export async function main(event, context) {
  const { user, status } = event.detail;

  const periodOpenStatusCodes = [
    VIVA_STATUS_APPLICATION_PERIOD_OPEN,
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  if (!validateApplicationStatus(status, periodOpenStatusCodes)) {
    log.info(
      `No open application found, status code: ${VIVA_STATUS_APPLICATION_PERIOD_OPEN}`,
      context.awsRequestId,
      'service-viva-ms-personApplicationStatus-001',
      status
    );
    return true;
  }

  const [putEventError] = await to(putVivaMsEvent.checkOpenPeriodSuccess({ user }));
  if (putEventError) {
    log.error(
      'Put event [checkOpenPeriodSuccess] failed',
      context.awsRequestId,
      'service-viva-ms-personApplicationStatus-002',
      putEventError
    );
    return false;
  }

  return true;
}
