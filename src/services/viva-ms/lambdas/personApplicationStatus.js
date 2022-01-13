/* eslint-disable no-console */
import to from 'await-to-js';

import log from '../../../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

export async function main(event, context) {
    const clientUser = event.detail;

    const [applicationStatusError, applicationStatusList] = await to(
        vivaAdapter.application.status(clientUser.personalNumber),
    );
    if (applicationStatusError) {
        log.error(
            'Vada: applicationStatusError',
            context.awsRequestId,
            'service-viva-ms-personApplicationStatus-001',
            applicationStatusError,
        );
        return false;
    }

    /**
     * The combination of status codes 1, 128, 256, 512
     * determines if a Viva application workflow is open for applicant.
     *
     * 1 - Application(period) is open for applicant,
     * 128 - Case exsits in Viva
     * 256 - An active e-application is activated in Viva
     * 512 - Application allows e-application
     *
     */
    const periodOpenStatusCodes = [1, 128, 256, 512];
    if (!validateApplicationStatus(applicationStatusList, periodOpenStatusCodes)) {
        log.info(
            'validateApplicationStatus. No open application period.',
            context.awsRequestId,
            null,
            applicationStatusList,
        );
        return false;
    }

    const [putEventError] = await to(putVivaMsEvent.checkOpenPeriodSuccess({ user: clientUser }));
    if (putEventError) {
        log.error(
            'putEventError: statusApplySuccess',
            context.awsRequestId,
            'service-viva-ms-personApplicationStatus-002',
            putEventError,
        );
        return false;
    }

    return true;
}
