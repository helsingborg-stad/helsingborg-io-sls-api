import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
  const body = JSON.parse(event.body);

  const { referenceCode, startTime, endTime } = body;
  if (!referenceCode || !startTime || !endTime) {
    return response.failure({
      status: 403,
      message:
        'Missing one of more required parameter: "referenceCode", "startTime", "endTime"',
    });
  }

  const searchBookingBody = { referenceCode, startTime, endTime };
  const [searchBookingError, searchBookingResponse] = await to(
    booking.search(searchBookingBody)
  );
  if (searchBookingError) {
    return response.failure(searchBookingError);
  }

  const { data } = searchBookingResponse.data;
  return response.success(200, data);
}
