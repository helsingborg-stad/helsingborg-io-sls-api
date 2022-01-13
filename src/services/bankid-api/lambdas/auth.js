/* eslint-disable no-console */
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';
import config from '../../../config';
import params from '../../../libs/params';
import * as request from '../../../libs/request';
import * as response from '../../../libs/response';
import * as bankId from '../helpers/bankId';
import log from '../../../libs/logs';

const SSMParams = params.read(config.bankId.envsKeyName);

export const main = async (event, context) => {
    const { endUserIp, personalNumber } = JSON.parse(event.body);
    const bankIdSSMparams = await SSMParams;

    const payload = {
        endUserIp,
        personalNumber,
    };

    const [error, bankIdAuthResponse] = await to(sendBankIdAuthRequest(bankIdSSMparams, payload));
    if (!bankIdAuthResponse) {
        log.error('Bank Id Auth response error', context.awsRequestId, 'service-bankid-api-auth-001', error);

        return response.failure(error);
    }

    const attributes = bankIdAuthResponse.data ? bankIdAuthResponse.data : {};

    return response.success(200, {
        type: 'bankIdAuth',
        attributes,
    });
};

async function sendBankIdAuthRequest(params, payload) {
    let error, bankIdClientResponse, bankIdAuthResponse;

    [error, bankIdClientResponse] = await to(bankId.client(params));
    if (!bankIdClientResponse) throwError(503);

    [error, bankIdAuthResponse] = await to(
        request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/auth'), payload),
    );

    if (!bankIdAuthResponse) throwError(error.response.status, error.response.data.details);

    return bankIdAuthResponse;
}
