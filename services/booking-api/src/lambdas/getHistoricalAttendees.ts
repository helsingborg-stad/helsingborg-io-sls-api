import to from 'await-to-js';

import * as response from '../libs/response';

import log from '../libs/logs';
import booking from '../helpers/booking';

const emailToDetails = {};

export async function main(
  event: {
    pathParameters: Record<string, string>;
    queryStringParameters: Record<string, string>;
  },
  context: { awsRequestId: string }
) {
  let referenceCode = event.pathParameters?.referenceCode;

  if (!referenceCode) {
    return response.failure({
      status: 403,
      message: 'Missing required parameter: "referenceCode"',
    });
  }

  referenceCode = decodeURIComponent(referenceCode);
  const { startTime = '', endTime = '' } = event.queryStringParameters ?? {};

  if (!startTime || !endTime) {
    return response.failure({
      status: 403,
      message: 'Missing one or more required query string parameters: "startTime", "endTime',
    });
  }

  const getHistoricalAttendeesBody = { referenceCode, startTime, endTime };
  const [getHistoricalAttendeesError, getHistoricalAttendeesResponse] = await to(
    booking.getHistoricalAttendees(getHistoricalAttendeesBody)
  );
  if (getHistoricalAttendeesError) {
    return response.failure(getHistoricalAttendeesError);
  }

  const { data } = getHistoricalAttendeesResponse?.data ?? {};

  const promises = data.attributes.map(async email => {
    if (!emailToDetails[email]) {
      let attributes = { Email: email };
      try {
        const lookupResponse = await booking.getAdministratorDetails({ email });
        attributes = lookupResponse?.data?.data?.attributes ?? { Email: email };
      } catch (error) {
        log.warn(
          'Datatorget lookup failed',
          context.awsRequestId,
          'service-booking-getHistoricalAttendees-001',
          error
        );
      } finally {
        emailToDetails[email] = attributes;
      }
    }
  });

  await Promise.all(promises);

  const newData = { ...data, attributes: data.attributes.map(email => emailToDetails[email]) };

  return response.success(200, newData);
}
