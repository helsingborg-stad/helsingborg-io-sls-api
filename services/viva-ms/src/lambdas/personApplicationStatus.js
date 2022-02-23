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
  const { user, vivaApplicantStatusCodeList } = event.detail;

  const periodOpenStatusCodes = [
    VIVA_STATUS_APPLICATION_PERIOD_OPEN,
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  if (!validateApplicationStatus(vivaApplicantStatusCodeList, periodOpenStatusCodes)) {
    log.info(
      'No open application found',
      context.awsRequestId,
      'service-viva-ms-personApplicationStatus-001',
      vivaApplicantStatusCodeList
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
