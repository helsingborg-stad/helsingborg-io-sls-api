import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
    let referenceCode = event.pathParameters?.referenceCode;

    if (!referenceCode) {
        return response.failure({
            status: 403,
            message: 'Missing required parameter: "referenceCode"',
        });
    }

    referenceCode = decodeURIComponent(referenceCode);
    const { startTime = '', endTime = '' } = event.queryStringParameters;

    if (!startTime | !endTime) {
        return response.failure({
            status: 403,
            message: 'Missing one or more required query string parameters: "startTime", "endTime',
        });
    }

    const getHistoricalAttendeesBody = { referenceCode, startTime, endTime };
    const [getHistoricalAttendeesError, getHistoricalAttendeesResponse] = await to(
        booking.getHistoricalAttendees(getHistoricalAttendeesBody),
    );
    if (getHistoricalAttendeesError) {
        return response.failure(getHistoricalAttendeesError);
    }

    const { data } = getHistoricalAttendeesResponse.data;
    return response.success(200, data);
}
