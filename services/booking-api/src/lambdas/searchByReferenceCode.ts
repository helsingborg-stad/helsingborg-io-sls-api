import to from 'await-to-js';

import * as response from '../libs/response';

import booking from '../helpers/booking';
import log from '../libs/logs';
import getEmailToDetailsMapping from '../helpers/mapAdminDetails';

export async function main(event: { body: string }, context: { awsRequestId: string }) {
  const body = JSON.parse(event.body);

  const { referenceCode, startTime, endTime } = body;
  if (!referenceCode || !startTime || !endTime) {
    log.error(
      'Missing one or more required query string parameters: "startTime", "endTime"',
      context.awsRequestId,
      'service-booking-api-searchByReferenceCode-001'
    );
    return response.failure({
      status: 403,
      message: 'Missing one of more required parameter: "referenceCode", "startTime", "endTime"',
    });
  }

  const searchBookingBody = { referenceCode, startTime, endTime };
  const [searchBookingError, searchBookingResponse] = await to(booking.search(searchBookingBody));
  if (searchBookingError) {
    log.error(
      'Failed to retrieve bookings from datatorget',
      context.awsRequestId,
      'service-booking-api-searchByReferenceCode-002',
      searchBookingError
    );
    return response.failure(searchBookingError);
  }

  const { data } = searchBookingResponse?.data ?? {};

  const emails = data.attributes
    .flatMap(booking => booking.Attendees)
    .map(attendee => attendee.Email);
  const uniqueEmails = [...new Set(emails)];

  const emailToDetails = await getEmailToDetailsMapping(uniqueEmails);

  data.attributes.forEach(booking => {
    booking.Attendees.forEach((attendee, index) => {
      booking.Attendees[index] = { ...attendee, ...emailToDetails[attendee.Email] };
    });
  });

  return response.success(200, data);
}
