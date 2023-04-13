import { AwsSqsService } from '../../sqs/awsSqsService';

import type {
  GetQueueAttributesCommand,
  ListDeadLetterSourceQueuesCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import type { Queue } from '../../sqs/sqs.types';

describe('AWS SQS Service', () => {
  it('creates correct queue objects', async () => {
    const mockClient: SQSClient = {
      send: (command: unknown) => {
        const commandName = command?.constructor.name;
        switch (commandName) {
          case 'ListQueuesCommand':
            return {
              QueueUrls: [
                'http://example.com/000000000000/queue-A',
                'http://example.com/000000000000/queue-B',
                'http://example.com/000000000000/queue-C',
                'http://example.com/000000000000/queue-D',
                'http://example.com/000000000000/queue-E',
              ],
            };
          case 'ListDeadLetterSourceQueuesCommand': {
            const url = (command as ListDeadLetterSourceQueuesCommand).input.QueueUrl;
            return url?.includes('queue-B') || url?.includes('queue-D') ? { queueUrls: ['a'] } : {};
          }
          case 'GetQueueAttributesCommand': {
            const url = (command as GetQueueAttributesCommand).input.QueueUrl;
            return url?.includes('queue-B')
              ? {
                  Attributes: {
                    ApproximateNumberOfMessages: '5',
                    ApproximateNumberOfMessagesNotVisible: '0',
                  },
                }
              : url?.includes('queue-C')
              ? {
                  Attributes: {
                    ApproximateNumberOfMessages: '100000',
                    ApproximateNumberOfMessagesNotVisible: '900',
                  },
                }
              : url?.includes('queue-D')
              ? { Attributes: { ApproximateNumberOfMessages: '2' } }
              : url?.includes('queue-E')
              ? { Attributes: { ApproximateNumberOfMessagesNotVisible: '7' } }
              : {};
          }
        }
      },
    } as unknown as SQSClient;

    const expected = [
      {
        name: 'queue-A',
        approximateMessageCount: -1,
        isDeadLetterQueue: false,
      },
      {
        name: 'queue-B',
        approximateMessageCount: 5,
        isDeadLetterQueue: true,
      },
      {
        name: 'queue-C',
        approximateMessageCount: 100900,
        isDeadLetterQueue: false,
      },
      {
        name: 'queue-D',
        approximateMessageCount: 2,
        isDeadLetterQueue: true,
      },
      {
        name: 'queue-E',
        approximateMessageCount: 7,
        isDeadLetterQueue: false,
      },
    ];

    const service = new AwsSqsService(mockClient);
    const result = await service.getQueues();

    expect(result).toEqual(expect.arrayContaining<Queue>(expected));
    expect(result).toHaveLength(expected.length);
  });
});
