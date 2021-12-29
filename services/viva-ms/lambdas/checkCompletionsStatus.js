import to from 'await-to-js';

import log from '../../../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

export async function main(event, context) {
  const { user, status } = event.detail;

  /**
   * The combination of status codes 64, 128, 256, 512
   * determines if a Viva application workflow requires completion
   *
   * 64 - Completion is required,
   * 128 - Case exsits in Viva
   * 256 - An active e-application is activated in Viva
   * 512 - Application allows e-application
   *
   */
  const completionStatusCodes = [64, 128, 256, 512];
  if (!validateApplicationStatus(status, completionStatusCodes)) {
    log.info(
      'Completion not required',
      context.awsRequestId,
      'service-viva-ms-checkCompletionsStatus-001',
      status
    );
    return false;
  }

  const [putEventError] = await to(putVivaMsEvent.checkCompletionsStatusRequired({ user }));
  if (putEventError) {
    log.error(
      'Put event [checkCompletionsStatusRequired] failed',
      context.awsRequestId,
      'service-viva-ms-checkCompletionsStatus-002',
      putEventError
    );
    return false;
  }

  return true;
}
