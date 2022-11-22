import { getMessages } from '../../src/lambdas/getMessages';

const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const mockJsonApi = { version: '1.0' };

// it('returns messages', async () => {
//   const expectedMessages = [
//     {
//       message: {
//         title: 'Hello',
//         text: 'World',
//       },
//       type: 'info',
//       start: '2022-11-14T00:00:00.000+01:00',
//       expiry: '2022-11-14T23:59:59.999+01:00',
//     },
//   ];

//   const result = await getMessages();

//   expect(result).toEqual(
//     expect.objectContaining({
//       statusCode: 200,
//       headers: mockHeaders,
//       body: JSON.stringify({
//         jsonapi: mockJsonApi,
//         data: {
//           messages: expectedMessages,
//         },
//       }),
//       isBase64Encoded: false,
//     })
//   );
// });

it('returns messages for the correct date', async () => {
  const expectedMessages = [
    {
      message: {
        title: 'Hello',
        text: 'World',
      },
      type: 'info',
      start: '2022-11-22T15:00:00.000+01:00',
      expiry: '2022-11-22T16:00:00.000+01:00',
    },
  ];

  const result = await getMessages();

  expect(result).toEqual(
    expect.objectContaining({
      statusCode: 200,
      headers: mockHeaders,
      body: JSON.stringify({
        jsonapi: mockJsonApi,
        data: {
          messages: expectedMessages,
        },
      }),
      isBase64Encoded: false,
    })
  );
});
