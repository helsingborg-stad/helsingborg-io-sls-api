import { main } from '../../lambdas/getHistoricalAttendees';
import booking from '../../helpers/booking';

jest.mock('../../helpers/booking');

const mockHeaders = {
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Origin': '*',
};

const mockCalendarBooking = {
    type: 'bookings',
    id: '123456789',
    attributes: ['outlook_1@helsingborg.se', 'outlook_2@helsingborg.se'],
};

const getHistoricalAttendeesMockData = {
    jsonapi: { version: '1.0' },
    data: mockCalendarBooking,
};

const mockReferenceCode = '1a2bc3';
const mockStartTime = 'startTime';
const mockEndTime = 'mockEndTime';
let mockEvent;

beforeEach(() => {
    jest.resetAllMocks();

    mockEvent = {
        pathParameters: {
            referenceCode: mockReferenceCode,
        },
        queryStringParameters: {
            startTime: mockStartTime,
            endTime: mockEndTime,
        },
    };
});

it('gets historical attendees successfully', async () => {
    expect.assertions(3);

    const expectedResult = {
        body: JSON.stringify(getHistoricalAttendeesMockData),
        headers: mockHeaders,
        statusCode: 200,
    };

    booking.getHistoricalAttendees.mockResolvedValueOnce({
        data: {
            data: mockCalendarBooking,
        },
    });

    const result = await main(mockEvent);

    expect(result).toEqual(expectedResult);
    expect(booking.getHistoricalAttendees).toHaveBeenCalledTimes(1);
    expect(booking.getHistoricalAttendees).toHaveBeenCalledWith({
        referenceCode: mockReferenceCode,
        startTime: mockStartTime,
        endTime: mockEndTime,
    });
});

it('returns failure if "referenceCode" is not provided as path parameter', async () => {
    expect.assertions(2);

    mockEvent.pathParameters.referenceCode = undefined;
    const statusCode = 403;
    const message = 'Missing required parameter: "referenceCode"';

    const expectedResult = {
        body: JSON.stringify({
            jsonapi: { version: '1.0' },
            data: {
                status: '403',
                code: '403',
                message,
            },
        }),
        headers: mockHeaders,
        statusCode,
    };

    const result = await main(mockEvent);

    expect(result).toEqual(expectedResult);
    expect(booking.getHistoricalAttendees).toHaveBeenCalledTimes(0);
});

it('returns failure if one of required query strings parameters does not exist', async () => {
    expect.assertions(2);

    mockEvent.queryStringParameters.startTime = undefined;

    const statusCode = 403;
    const message = 'Missing one or more required query string parameters: "startTime", "endTime';

    const expectedResult = {
        body: JSON.stringify({
            jsonapi: { version: '1.0' },
            data: {
                status: '403',
                code: '403',
                message,
            },
        }),
        headers: mockHeaders,
        statusCode,
    };

    const result = await main(mockEvent);

    expect(result).toEqual(expectedResult);
    expect(booking.getHistoricalAttendees).toHaveBeenCalledTimes(0);
});

it('returns failure if datatorget request fails', async () => {
    expect.assertions(2);

    const statusCode = 500;
    const message = 'error';

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

    booking.getHistoricalAttendees.mockRejectedValueOnce({ status: statusCode, message });

    const result = await main(mockEvent);

    expect(result).toEqual(expectedResult);
    expect(booking.getHistoricalAttendees).toHaveBeenCalledTimes(1);
});
