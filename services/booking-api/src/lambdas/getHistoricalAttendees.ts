import to from 'await-to-js';

import * as response from '../libs/response';

import booking from '../helpers/booking';

const emailToDetails = {};

export async function main(event: {
  pathParameters: Record<string, string>;
  queryStringParameters: Record<string, string>;
}) {
  let referenceCode = event.pathParameters?.referenceCode;

  if (!referenceCode) {
    return response.failure({
      status: 403,
      message: 'Missing required parameter: "referenceCode"',
    });
  }

  referenceCode = decodeURIComponent(referenceCode);
  const { startTime = '', endTime = '' } = event.queryStringParameters;

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

  for (const email of data.attributes) {
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

  data.attributes = data.attributes.map(email => emailToDetails[email]);

  return response.success(200, data);
}
