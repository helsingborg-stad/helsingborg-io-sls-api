import messages from '@helsingborg-stad/npm-api-error-handling/assets/errorMessages';

import { main } from '../../lambdas/cancel';
import booking from '../../helpers/booking';

jest.mock('../../helpers/booking');

const mockBookingId = '1a2bc3';
const mockEvent = {
    pathParameters: {
        id: mockBookingId,
    },
};
const mockHeaders = {
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Origin': '*',
};

it('cancels a booking successfully', async () => {
    expect.assertions(2);

    const expectedResult = {
        body: JSON.stringify({
            jsonapi: { version: '1.0' },
            data: { bookingId: mockBookingId },
        }),
        headers: mockHeaders,
        statusCode: 200,
    };
    booking.cancel.mockResolvedValue();

    const result = await main(mockEvent);

    expect(result).toEqual(expectedResult);
    expect(booking.cancel).toHaveBeenCalledWith(mockBookingId);
});

it('throws when booking.cancel fails', async () => {
    expect.assertions(1);

    const statusCode = 500;
    const message = messages[statusCode];
    const expectedResult = {
        body: JSON.stringify({
            jsonapi: { version: '1.0' },
            data: {
                status: '500',
                code: '500',
                message,
            },
        }),
        headers: mockHeaders,
        statusCode,
    };

    booking.cancel.mockRejectedValueOnce({ status: statusCode, message });

    const result = await main(mockEvent);

    expect(result).toEqual(expectedResult);
});
