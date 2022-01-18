import to from 'await-to-js';

import log from '../../../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event, context) {
  const clientUser = event.detail;

  const [applicationStatusError, applicationStatusList] = await to(
    vivaAdapter.application.status(clientUser.personalNumber)
  );
  if (applicationStatusError) {
    log.error(
      'Error getting Viva application status',
      context.awsRequestId,
      'service-viva-ms-applicationStatus-001',
      applicationStatusError
    );
    return false;
  }

  const [putEventError] = await to(
    putVivaMsEvent.applicationStatusSuccess({
      user: clientUser,
      status: applicationStatusList,
    })
  );
  if (putEventError) {
    log.error(
      'Error put event [applicationStatusSuccess]',
      context.awsRequestId,
      'service-viva-ms-applicationStatus-002',
      putEventError
    );
    return false;
  }

  return true;
}
