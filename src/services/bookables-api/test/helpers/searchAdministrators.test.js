// import { InternalServerError } from '@helsingborg-stad/npm-api-error-handling/src/errors';

import searchAdministrators from '../../helpers/searchAdministrators';
import params from '../../../../libs/params';
import { call } from '../../../../libs/request';

jest.mock('../../../../libs/params');
jest.mock('../../../../libs/request');

const mockApiKey = 'mockKey';
const mockOutlookSearchEndpoint = 'mockEndpoint';

it('throws if it receives an error when making request against datatorget API', async () => {
    expect.assertions(1);

    const datatorgetError = {
        jsonapi: {
            version: '1.0',
        },
        errors: [
            {
                status: '500',
                title: 'some title',
            },
        ],
    };

    params.read.mockResolvedValueOnce({
        outlookSearchEndpoint: mockOutlookSearchEndpoint,
        apiKey: mockApiKey,
    });

    call.mockImplementation(jest.fn().mockRejectedValueOnce(datatorgetError));

    try {
        await searchAdministrators({ mailbox: 'bla@helsingborg.se' });
    } catch (error) {
        expect(error).toEqual(datatorgetError);
    }
});

it('returns a successful response ', async () => {
    expect.assertions(1);

    params.read.mockResolvedValueOnce({
        outlookSearchEndpoint: mockOutlookSearchEndpoint,
        apiKey: mockApiKey,
    });

    const datatorgetResponse = {
        jsonapi: {
            version: '1.0',
        },
        data: {
            data: {
                type: 'bookings',
                id: 'xxxx',
                attributes: ['email_1@email.com', 'email_2@email.com'],
            },
        },
    };

    call.mockImplementation(jest.fn().mockResolvedValueOnce(datatorgetResponse));

    const result = await searchAdministrators({ mailbox: 'bla@helsingborg.se' });

    expect(result).toEqual(datatorgetResponse);
});
