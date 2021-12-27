/* eslint-disable no-console */
import to from 'await-to-js';

import log from '../../../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

export async function main(event, context) {
  const clientUser = event.detail;

  const [applicationStatusError, applicationStatusList] = await to(
    vivaAdapter.application.status(clientUser.personalNumber)
  );
  if (applicationStatusError) {
    log.error(
      'Viva application status failed',
      context.awsRequestId,
      'service-viva-ms-checkCompletionsStatus-001',
      applicationStatusError
    );
    return false;
  }

  /**
   * The Combination of Status Codes 64, 128, 256, 512
   * determines if a VIVA Application Workflow requires completion
   * 64 - Completion is required,
   * 128 - Case exsits in VIVA
   * 256 - An active e-application is activated in VIVA
   * 512 - Application allows e-application
   */
  const completionStatusCodes = [64, 128, 256, 512];
  if (!validateApplicationStatus(applicationStatusList, completionStatusCodes)) {
    log.info(
      'No Viva completion status(64) found',
      context.awsRequestId,
      'service-viva-ms-checkCompletionsStatus-002',
      applicationStatusList
    );
    return true;
  }

  const [putEventError] = await to(
    putVivaMsEvent.checkCompletionsStatusRequired({ user: clientUser })
  );
  if (putEventError) {
    log.error(
      'Put event [checkCompletionsStatusRequired] failed',
      context.awsRequestId,
      'service-viva-ms-checkCompletionsStatus-003',
      putEventError
    );
    return false;
  }

  return true;
}
