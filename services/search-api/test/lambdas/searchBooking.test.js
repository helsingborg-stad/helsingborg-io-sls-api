import messages from '@helsingborg-stad/npm-api-error-handling/assets/errorMessages';

import { main } from '../../lambdas/searchBookings';
import { searchBookings } from '../../helpers/search';

jest.mock('../../helpers/search');

const mockBody = {
  attendee: 'outlook.user@helsingborg.se',
  startTime: '2021-05-30T9:00:00',
  endTime: '2021-05-30T12:00:00',
};

const mockEvent = {
  body: JSON.stringify(mockBody),
};

const mockSearchResponse = {
  data: {
    type: 'outlookcalendarevents',
    id: 'outlook.user@helsingborg.se',
    attributes: {
      participant: 'outlook.user@helsingborg.se',
    },
    intervals: [
      {
        eventId: 'xxxxx',
        startTime: '2021-05-30T10:00:00',
        endTime: '2021-05-30T11:00:00',
        busyType: 'Busy',
        isMeeting: 'true',
        subject: 'Test subject',
      },
    ],
  },
};

it('returns a correctly formatted success response when receiving a successful response from searchBookings', async () => {
  expect.assertions(2);

  const expectedResult = {
    body: JSON.stringify({ jsonapi: { version: '1.0' }, ...mockSearchResponse }),
    headers: {
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': '*',
    },
    statusCode: 200,
  };

  searchBookings.mockResolvedValueOnce({ data: mockSearchResponse });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(searchBookings).toHaveBeenCalledWith(mockBody);
});

it('throws an error when receiving an error response from searchBookings', async () => {
  expect.assertions(1);

  const statusCode = 500;
  const message = messages[statusCode];

  searchBookings.mockRejectedValueOnce({ statusCode, message });

  await expect(main(mockEvent)).rejects.toThrow(message);
});
