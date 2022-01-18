import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import params from '../../../libs/params';
import config from '../../../config';

async function getBookables() {
    const { bookables } = await getSsmParameters();
    return bookables;
}

async function getSsmParameters() {
    const [error, response] = await to(params.read(config.bookables.envsKeyName));
    if (error) {
        throwError(500);
    }

    return response;
}

export { getBookables };
