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
    const { orderRef } = JSON.parse(event.body);
    const bankIdSSMparams = await SSMParams;

    const payload = { orderRef };

    const [error, bankIdCancelResponse] = await to(sendBankIdCancelRequest(bankIdSSMparams, payload));

    if (!bankIdCancelResponse) {
        log.error('Bank Id Cancel response error', context.awsRequestId, 'service-bankid-api-cancel-001', error);

        return response.failure(error);
    }

    const attributes = bankIdCancelResponse.data ? bankIdCancelResponse.data : {};

    return response.success(200, {
        type: 'bankidCancel',
        attributes,
    });
};

async function sendBankIdCancelRequest(params, payload) {
    let error, bankIdClientResponse, bankIdCancelResponse;

    [error, bankIdClientResponse] = await to(bankId.client(params));
    if (!bankIdClientResponse) throwError(503);

    [error, bankIdCancelResponse] = await to(
        request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/cancel'), payload),
    );
    if (!bankIdCancelResponse) throwError(error.response.status, error.response.data.details);

    return bankIdCancelResponse;
}
