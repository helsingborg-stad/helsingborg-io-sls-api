import { MessageType, getMessages } from '../../src/lambdas/getMessages';
import type { MessageItem, FunctionResponse } from '../../src/lambdas/getMessages';

function createFunctionResponse(messages: MessageItem[]): FunctionResponse {
  return {
    attributes: {
      messages,
    },
  };
}

it('returns messages between current start date and expire date', async () => {
  jest.useFakeTimers('modern').setSystemTime(new Date('2022-01-01T02:00:00.000'));

  const mockMessages: MessageItem[] = [
    {
      message: {
        title: 'Hello',
        text: 'World',
      },
      type: MessageType.Info,
      start: '2022-01-01T00:00:00.000+01:00',
      expiry: '2022-01-01T23:59:59.999+01:00',
    },
    {
      message: {
        title: 'Hello2',
        text: 'World2',
      },
      type: MessageType.Maintenance,
      start: '2022-01-20T00:00:00.000+01:00',
      expiry: '2022-01-20T23:59:59.999+01:00',
    },
  ];

  const expectedMessages: MessageItem[] = [
    {
      message: {
        title: 'Hello',
        text: 'World',
      },
      type: MessageType.Info,
      start: '2022-01-01T00:00:00.000+01:00',
      expiry: '2022-01-01T23:59:59.999+01:00',
    },
  ];

  const result = await getMessages(undefined as never, {
    getStatusMessages: jest.fn().mockResolvedValueOnce(mockMessages),
  });

  expect(result).toEqual(createFunctionResponse(expectedMessages));
});

it('returns empty messages list if dates is expired', async () => {
  jest.useFakeTimers('modern').setSystemTime(new Date('2022-02-01T00:00:00.000'));

  const mockMessages: MessageItem[] = [
    {
      message: {
        title: 'Hello',
        text: 'World',
      },
      type: MessageType.Info,
      start: '2022-01-01T00:00:00.000+01:00',
      expiry: '2022-01-01T23:59:59.999+01:00',
    },
    {
      message: {
        title: 'Hello2',
        text: 'World2',
      },
      type: MessageType.Maintenance,
      start: '2022-01-20T00:00:00.000+01:00',
      expiry: '2022-01-20T23:59:59.999+01:00',
    },
  ];

  const expectedMessages: MessageItem[] = [];

  const result = await getMessages(undefined as never, {
    getStatusMessages: jest.fn().mockResolvedValueOnce(mockMessages),
  });

  expect(result).toEqual(createFunctionResponse(expectedMessages));
});

it('returns empty messages list if dates is not started', async () => {
  jest.useFakeTimers('modern').setSystemTime(new Date('2021-01-01T00:00:00.000'));

  const mockMessages: MessageItem[] = [
    {
      message: {
        title: 'Hello',
        text: 'World',
      },
      type: MessageType.Info,
      start: '2022-01-01T00:00:00.000+01:00',
      expiry: '2022-01-01T23:59:59.999+01:00',
    },
    {
      message: {
        title: 'Hello2',
        text: 'World2',
      },
      type: MessageType.Maintenance,
      start: '2022-01-20T00:00:00.000+01:00',
      expiry: '2022-01-20T23:59:59.999+01:00',
    },
  ];

  const expectedMessages: MessageItem[] = [];

  const result = await getMessages(undefined as never, {
    getStatusMessages: jest.fn().mockResolvedValueOnce(mockMessages),
  });

  expect(result).toEqual(createFunctionResponse(expectedMessages));
});
