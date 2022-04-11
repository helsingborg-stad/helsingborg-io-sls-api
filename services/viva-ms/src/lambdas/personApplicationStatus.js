import to from 'await-to-js';

import log from '../libs/logs';

import {
  VIVA_STATUS_NEW_APPLICATION_OPEN,
  VIVA_STATUS_APPLICATION_PERIOD_OPEN,
  VIVA_STATUS_CASE_EXISTS,
  VIVA_STATUS_WEB_APPLICATION_ACTIVE,
  VIVA_STATUS_WEB_APPLICATION_ALLOWED,
} from '../helpers/constants';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

export async function main(event, context) {
  const { user, status } = event.detail;

  const recurringPeriodOpenStatusCodes = [
    VIVA_STATUS_APPLICATION_PERIOD_OPEN,
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  if (validateApplicationStatus(status, recurringPeriodOpenStatusCodes)) {
    const [putEventError] = await to(putVivaMsEvent.checkOpenPeriodSuccess({ user }));
    if (putEventError) {
      log.error(
        'Put event [checkOpenPeriodSuccess] failed',
        context.awsRequestId,
        'service-viva-ms-personApplicationStatus-001',
        putEventError
      );
      return false;
    }
  }

  const newApplicationOpenStatusCodes = [VIVA_STATUS_NEW_APPLICATION_OPEN];
  if (validateApplicationStatus(status, newApplicationOpenStatusCodes)) {
    const [putEventError] = await to(putVivaMsEvent.checkOpenNewApplicationSuccess(event.detail));
    if (putEventError) {
      log.error(
        'Put event [checkOpenNewApplicationSuccess] failed',
        context.awsRequestId,
        'service-viva-ms-personApplicationStatus-002',
        putEventError
      );
      return false;
    }
  }

  return true;
}
