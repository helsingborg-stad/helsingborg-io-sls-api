import { ValidatorData } from '../../src/helpers/types';
import validateCases from '../../src/helpers/validateCases';
import htmlStateExpiredTest from '../../src/validators/htmlStateExpired';

it('', async () => {
  const result: ValidatorData[] = [];

  await validateCases({
    getAge: () => 7200001,
    getTests: () => [htmlStateExpiredTest],
    getCases: async () =>
      Promise.resolve({
        Items: [
          {
            PK: '####',
            SK: '####',
            status: {
              type: 'active:completionRequired:viva',
            },
            state: 'CASE_HTML_GENERATED',
            updatedAt: 1641293973095,
          },
        ],
      }),
    log: data => result.push(data),
  });
  expect(result[0]).toStrictEqual({
    testId: 'TEST_HTML_EXPIRED',
    level: 'error',
    message: 'State CASE_HTML_GENERATED not expected after 2 hours.',
  });
});
