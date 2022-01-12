import to from 'await-to-js';

import log from '../../../libs/logs';

import {
  VIVA_STATUS_COMPLETION,
  VIVA_STATUS_CASE_EXISTS,
  VIVA_STATUS_WEB_APPLICATION_ACTIVE,
  VIVA_STATUS_WEB_APPLICATION_ALLOWED,
} from '../helpers/constans';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

export async function main(event, context) {
  const { user, status } = event.detail;

  const completionStatusCodes = [
    VIVA_STATUS_COMPLETION,
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  if (!validateApplicationStatus(status, completionStatusCodes)) {
    log.info(
      `No Viva completion status(${VIVA_STATUS_COMPLETION}) found`,
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
