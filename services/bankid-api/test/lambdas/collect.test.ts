import { collect } from '../../src/lambdas/collect';

import * as response from '../../../../libs/response';

import type { LambdaRequest, Dependencies } from '../../src/lambdas/collect';

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

function createInput(): LambdaRequest {
  return {
    body: mockBody,
    headers: mockHeaders,
  };
}

function createSuccessResponse(
  partialBankIdResponse: Partial<{
    authorizationCode: string;
    status: string;
  }> = {}
) {
  return response.success(200, {
    type: 'bankIdCollect',
    attributes: {
      ...(partialBankIdResponse.authorizationCode && { authorizationCode: mockAuthorizationCode }),
      status: partialBankIdResponse.status ?? 'pending',
      completionData: {
        user: mockUser,
      },
    },
  });
}

function createFailureResponse(error: { status: number; message: string }) {
  return response.failure(error, {
    type: 'bankIdCollect',
  });
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

  expect(result).toEqual(createSuccessResponse());
  expect(sendBankIdStatusCompleteEventMock).not.toHaveBeenCalled();
});

it('returns collect data successfully for bankId status complete', async () => {
  const sendBankIdStatusCompleteEventMock = jest.fn();

  const result = await collect(
    createInput(),
    createDependencies({
      sendBankIdStatusCompleteEvent: sendBankIdStatusCompleteEventMock,
    })
  );

  expect(result).toEqual(
    createSuccessResponse({
      authorizationCode: mockAuthorizationCode,
      status: 'complete',
    })
  );
  expect(sendBankIdStatusCompleteEventMock).toHaveBeenCalled();
});

it('returns failure for failing sendBankIdCollectRequest', async () => {
  const mockErrorObject = {
    status: 404,
    message: 'not found',
  };
  const sendBankIdCollectRequestMock = jest.fn().mockRejectedValueOnce(mockErrorObject);

  const result = await collect(
    createInput(),
    createDependencies({
      sendBankIdCollectRequest: sendBankIdCollectRequestMock,
    })
  );

  expect(result).toEqual(createFailureResponse(mockErrorObject));
});

it('returns failure for failing generateAuthorizationCode request', async () => {
  const mockErrorObject = {
    status: 500,
    message: 'internal server error',
  };
  const generateAuthorizationCodeMock = jest.fn().mockRejectedValueOnce(mockErrorObject);

  const result = await collect(
    createInput(),
    createDependencies({
      generateAuthorizationCode: generateAuthorizationCodeMock,
    })
  );

  expect(result).toEqual(createFailureResponse(mockErrorObject));
});
