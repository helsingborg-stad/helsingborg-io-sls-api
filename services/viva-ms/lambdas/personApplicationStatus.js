import to from 'await-to-js';

import log from '../../../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

export async function main(event, context) {
  const { user, status } = event.detail;

  /**
   * The combination of status codes 1, 128, 256, 512
   * determines if a Viva application workflow is open for applicant
   *
   * 1 - Application(period) is open for applicant,
   * 128 - Case exsits in Viva
   * 256 - An active e-application is activated in Viva
   * 512 - Application allows e-application
   *
   */
  const periodOpenStatusCodes = [1, 128, 256, 512];
  if (!validateApplicationStatus(status, periodOpenStatusCodes)) {
    log.info(
      'No open application period',
      context.awsRequestId,
      'service-viva-ms-personApplicationStatus-001',
      status
    );
    return false;
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
