import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
  console.log('EVENT: ', JSON.stringify(event, undefined));

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
  const [searchBookingError, searchBookingResponse] = await to(
    booking.getHistoricalAttendees(getHistoricalAttendeesBody)
  );
  if (searchBookingError) {
    return response.failure(searchBookingError);
  }

  const { data } = searchBookingResponse.data;
  return response.success(200, data);
}
