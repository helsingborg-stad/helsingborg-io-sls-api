import to from 'await-to-js';

import * as response from '../libs/response';
import log from '../libs/logs';

import booking from '../helpers/booking';
import getCreateBookingBody from '../helpers/getCreateBookingBody';
import { BookingRequest } from '../helpers/types';
import getMeetingHtmlBody from '../helpers/getMeetingHtmlBody';
import { validateCreateBookingRequest } from '../helpers/validateCreateBookingRequest';

export async function main(event: { body: string }, { awsRequestId }: { awsRequestId: string }) {
  const bookingRequest: BookingRequest = JSON.parse(event.body);
  const {
    organizationRequiredAttendees,
    externalRequiredAttendees,
    startTime,
    endTime,
    remoteMeeting,
    subject,
  } = bookingRequest;

  let remoteMeetingLink: string | undefined;

  try {
    await validateCreateBookingRequest(bookingRequest);
  } catch (error) {
    log.error(
      (error as Record<string, string>).message,
      awsRequestId,
      'service-booking-api-create-001'
    );
    return response.failure({
      status: 400,
      ...(error as Record<string, string>),
    });
  }

  if (remoteMeeting) {
    const [createRemoteMeetingError, createRemoteMeetingResponse] = await to(
      booking.createRemoteMeeting({
        attendees: [...organizationRequiredAttendees, ...externalRequiredAttendees],
        endTime,
        startTime,
        subject,
      })
    );

    if (createRemoteMeetingError) {
      const message = 'Could not create remote meeting link';
      log.error(message, awsRequestId, 'service-booking-api-create-002', createRemoteMeetingError);
      return response.failure(createRemoteMeetingError);
    }

    remoteMeetingLink = createRemoteMeetingResponse?.data?.data?.attributes.OnlineMeetingUrl;
  }

  const bookingHtmlBody = getMeetingHtmlBody(bookingRequest.formData, remoteMeetingLink);
  const createBookingBody = getCreateBookingBody(bookingRequest, bookingHtmlBody);

  const [error, createBookingResponse] = await to(booking.create(createBookingBody));
  if (error) {
    const message = 'Could not create new booking';
    log.error(message, awsRequestId, 'service-booking-api-create-003', error);
    return response.failure(error);
  }

  const bookingId = createBookingResponse?.data?.data?.attributes.BookingId;

  return response.success(200, { bookingId });
}
