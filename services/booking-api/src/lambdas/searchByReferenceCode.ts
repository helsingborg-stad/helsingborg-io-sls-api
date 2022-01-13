import to from 'await-to-js';

import * as response from '../libs/response';

import booking from '../helpers/booking';

const emailToDetails = {};

export async function main(event: { body: string }) {
  const body = JSON.parse(event.body);

  const { referenceCode, startTime, endTime } = body;
  if (!referenceCode || !startTime || !endTime) {
    return response.failure({
      status: 403,
      message: 'Missing one of more required parameter: "referenceCode", "startTime", "endTime"',
    });
  }

  const searchBookingBody = { referenceCode, startTime, endTime };
  const [searchBookingError, searchBookingResponse] = await to(booking.search(searchBookingBody));
  if (searchBookingError) {
    return response.failure(searchBookingError);
  }

  const { data } = searchBookingResponse?.data ?? {};

  const emails = data.attributes.map(booking => booking.Attendees[0].Email);
  const uniqueEmails = [...new Set(emails)];

  for (const email of uniqueEmails) {
    if (!emailToDetails[email]) {
      const lookupResponse = await booking.getAdministratorDetails({ email });
      emailToDetails[email] = lookupResponse?.data?.data?.attributes;
    }
  }

  data.attributes.forEach(booking => {
    booking.Attendees[0] = {
      ...booking.Attendees[0],
      ...emailToDetails[booking.Attendees[0].Email],
    };
  });

  return response.success(200, data);
}
