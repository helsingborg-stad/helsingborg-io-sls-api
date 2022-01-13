import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';
import config from '../../../config';
import params from '../../../libs/params';
import * as request from '../../../libs/request';
import { failure, success } from '../../../libs/response';
import { validateEventBody } from '../../../libs/validateEventBody';
import { validateKeys } from '../../../libs/validateKeys';
import * as bankId from '../helpers/bankId';
import log from '../../../libs/logs';

const SSMParams = params.read(config.bankId.envsKeyName);
let valid = true;

export const main = async (event, context) => {
    const bankidSSMParams = await SSMParams;
    const { endUserIp, personalNumber, userVisibleData } = JSON.parse(event.body);

    const [validationError] = await to(validateEventBody(event.body, validateTokenEventBody));

    if (validationError && !valid) {
        log.error('Validation error', context.awsRequestId, 'service-bankid-api-sign-001', validationError);

        return failure(validationError);
    }

    const payload = {
        endUserIp,
        personalNumber,
        userVisibleData: userVisibleData
            ? Buffer.from(userVisibleData).toString('base64') // eslint-disable-line no-undef
            : undefined,
    };

    const [error, bankIdSignResponse] = await to(sendBankIdSignRequest(bankidSSMParams, payload));

    if (!bankIdSignResponse) {
        log.error('Bank Id Sign response error', context.awsRequestId, 'service-bankid-api-sign-002', error);

        return failure(error);
    }

    const attributes = bankIdSignResponse.data ? bankIdSignResponse.data : {};

    return success(200, {
        type: 'bankIdSign',
        attributes,
    });
};
// Not validating personalNumber as it is an optional Parameter
function validateTokenEventBody(body) {
    let errorStatusCode, errorMessage;
    valid = true;

    if (!validateKeys(JSON.parse(body), ['endUserIp', 'userVisibleData'])) {
        valid = false;
        errorStatusCode = 400;
        errorMessage = 'Missing JSON body parameter';
    }

    return [valid, errorStatusCode, errorMessage];
}

async function sendBankIdSignRequest(params, payload) {
    let error, bankIdClientResponse, bankIdSignResponse;
    [error, bankIdClientResponse] = await to(bankId.client(params));

    if (!bankIdClientResponse) throwError(error.response.status, error.response.data.details);

    [error, bankIdSignResponse] = await to(
        request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/sign'), payload),
    );

    if (!bankIdSignResponse) throwError(error.response.status, error.response.data.details);
    return bankIdSignResponse;
}
