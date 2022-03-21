import to from 'await-to-js';

import * as response from '../libs/response';
import log from '../libs/logs';

import booking from '../helpers/booking';
import getCreateBookingBody from '../helpers/getCreateBookingBody';
import { BookingRequest } from '../helpers/types';
import getMeetingHtmlBody from '../helpers/getMeetingHtmlBody';
import { validateCreateBookingRequest } from '../helpers/validateCreateBookingRequest';

export async function main(
  event: { pathParameters: Record<string, string>; body: string },
  { awsRequestId }: { awsRequestId: string }
) {
  const bookingId = decodeURIComponent(event.pathParameters.id);

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

  const [cancelError] = await to(booking.cancel(bookingId));
  if (cancelError) {
    const message = 'Timeslot cancellation failed';
    log.error(message, awsRequestId, 'service-booking-api-update-002', cancelError);
    return response.failure({ message, status: 500 });
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
      log.error(message, awsRequestId, 'service-booking-api-create-003', createRemoteMeetingError);
      return response.failure(createRemoteMeetingError);
    }

    remoteMeetingLink = createRemoteMeetingResponse?.data?.data?.attributes.OnlineMeetingUrl;
  }

  const bookingHtmlBody = getMeetingHtmlBody(bookingRequest.formData, remoteMeetingLink);
  const createBookingBody = getCreateBookingBody(bookingRequest, bookingHtmlBody);

  const [createError, createBookingResponse] = await to(booking.create(createBookingBody));
  if (createError) {
    const message = 'Timeslot creation failed';
    log.error(message, awsRequestId, 'service-booking-api-update-004', createError);
    return response.failure({ message, status: 500 });
  }

  const newBookingId = createBookingResponse?.data?.data?.attributes.BookingId;

  return response.success(200, { bookingId: newBookingId });
}
