import to from 'await-to-js';

import log from '../libs/logs';

import {
  VIVA_STATUS_COMPLETION,
  VIVA_STATUS_CASE_EXISTS,
  VIVA_STATUS_WEB_APPLICATION_ACTIVE,
  VIVA_STATUS_WEB_APPLICATION_ALLOWED,
} from '../helpers/constants';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

export async function main(event, context) {
  const { vivaApplicantStatusCodeList } = event.detail;

  const completionStatusCodes = [
    VIVA_STATUS_COMPLETION,
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  if (validateApplicationStatus(vivaApplicantStatusCodeList, completionStatusCodes)) {
    const [putEventError] = await to(putVivaMsEvent.checkCompletionsStatusRequired(event.detail));
    if (putEventError) {
      log.error(
        'Put event [checkCompletionsStatusRequired] failed',
        context.awsRequestId,
        'service-viva-ms-checkCompletionsStatus-010',
        putEventError
      );
      return false;
    }
    return true;
  }

  const [putEventError] = await to(putVivaMsEvent.checkCompletionSuccess(event.detail));
  if (putEventError) {
    log.error(
      'Put event [checkCompletionSuccess] failed',
      context.awsRequestId,
      'service-viva-ms-checkCompletionsStatus-020',
      putEventError
    );
    return false;
  }

  return true;
}
