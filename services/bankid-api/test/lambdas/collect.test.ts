import { collect } from '../../src/lambdas/collect';

import * as response from '../../../../libs/response';

import type { LambdaRequest, Dependencies } from '../../src/lambdas/collect';

const mockUser = {
  personalNumber: '199009111111',
};
const mockAuthorizationCode = '123456';

function createDependencies(): Dependencies {
  return {
    sendBankIdCollectRequest: () =>
      Promise.resolve({ data: { status: 'complete', completionData: { user: mockUser } } }),
    generateAuthorizationCode: () => Promise.resolve(mockAuthorizationCode),
  };
}

function createInput(): LambdaRequest {
  return {
    body: JSON.stringify({ orderRef: '123456' }),
    headers: {},
  };
}

it('returns collect data successfully', async () => {
  const result = await collect(createInput(), createDependencies());

  expect(result).toEqual(
    response.success(200, {
      type: 'bankIdCollect',
      attributes: {
        status: 'complete',
        completionData: {
          user: mockUser,
        },
      },
    })
  );
});
