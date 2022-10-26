import { collect } from '../../src/lambdas/collect';

import type { FunctionInput, Dependencies } from '../../src/lambdas/collect';

const mockUser = {
  personalNumber: '199009111111',
};
const mockAuthorizationCode = '123456';
const mockBody = JSON.stringify({ orderRef: '123456' });
const mockHeaders = { 'User-Agent': 'MittHelsingborg/1.3.0/ios/15.0' };

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    sendBankIdCollectRequest: () =>
      Promise.resolve({ data: { status: 'complete', completionData: { user: mockUser } } }),
    generateAuthorizationCode: () => Promise.resolve(mockAuthorizationCode),
    sendBankIdStatusCompleteEvent: () => Promise.resolve(),
    ...partialDependencies,
  };
}

function createInput(): FunctionInput {
  return {
    body: mockBody,
    headers: mockHeaders,
  };
}

it('returns collect data successfully for bankId status pending', async () => {
  const sendBankIdStatusCompleteEventMock = jest.fn();

  const result = await collect(
    createInput(),
    createDependencies({
      sendBankIdCollectRequest: () =>
        Promise.resolve({ data: { status: 'pending', completionData: { user: mockUser } } }),
      sendBankIdStatusCompleteEvent: sendBankIdStatusCompleteEventMock,
    })
  );

  expect(result).toEqual({
    completionData: {
      user: mockUser,
    },
    status: 'pending',
  });
  expect(sendBankIdStatusCompleteEventMock).not.toHaveBeenCalled();
});

it('returns collect data successfully for bankId status complete', async () => {
  const sendBankIdStatusCompleteEventMock = jest.fn();
  const expectedPutEventParams = { user: mockUser };

  const result = await collect(
    createInput(),
    createDependencies({
      sendBankIdStatusCompleteEvent: sendBankIdStatusCompleteEventMock,
    })
  );

  expect(result).toEqual({
    authorizationCode: mockAuthorizationCode,
    completionData: {
      user: mockUser,
    },
    status: 'complete',
  });
  expect(sendBankIdStatusCompleteEventMock).toHaveBeenCalledTimes(1);
  expect(sendBankIdStatusCompleteEventMock).toHaveBeenCalledWith(
    expectedPutEventParams,
    'BankIdCollectComplete',
    'bankId.collect'
  );
});
