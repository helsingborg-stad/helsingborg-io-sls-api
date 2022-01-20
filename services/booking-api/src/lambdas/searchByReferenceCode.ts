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

  const emails = data.attributes
    .flatMap(booking => booking.Attendees)
    .map(attendee => attendee.Email);
  const uniqueEmails = [...new Set(emails)];

  for (const email of uniqueEmails) {
    if (!emailToDetails[email]) {
      let attributes = { email };
      try {
        const lookupResponse = await booking.getAdministratorDetails({ email });
        attributes = lookupResponse?.data?.data?.attributes ?? { email };
      } finally {
        emailToDetails[email] = attributes;
      }
    }
  }

  data.attributes.forEach(booking => {
    booking.Attendees.forEach((attendee, index) => {
      booking.Attendees[index] = emailToDetails[attendee.Email];
    });
  });

  return response.success(200, data);
}
