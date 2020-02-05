// Mock
const forms = [
  {
    formId: 987,
    userId: 234,
    answers: [
      {
        id: 123,
        body: 'Hello Dude!',
      },
      {
        id: 432,
        body: 'Lorem ipsum',
      },
    ],
  },
  {
    formId: 765,
    userId: 567,
    answers: [
      {
        id: 456,
        body: 'I\'m is Cool!',
      },
      {
        id: 672,
        body: 'Dolor sit amet',
      },
    ],
  },
];

// GET
export const main = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ forms }),
  };

  callback(null, response);
};
