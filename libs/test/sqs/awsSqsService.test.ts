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
              ],
            };
          case 'ListDeadLetterSourceQueuesCommand': {
            const url = (command as ListDeadLetterSourceQueuesCommand).input.QueueUrl;
            return url?.includes('queue-B') ? { queueUrls: ['a'] } : {};
          }
          case 'GetQueueAttributesCommand': {
            const url = (command as GetQueueAttributesCommand).input.QueueUrl;
            return url?.includes('queue-B')
              ? { Attributes: { ApproximateNumberOfMessages: '5' } }
              : url?.includes('queue-C')
              ? { Attributes: { ApproximateNumberOfMessages: '100000' } }
              : {};
          }
        }
      },
    } as unknown as SQSClient;

    const expected = expect.arrayContaining<Queue>([
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
        approximateMessageCount: 100000,
        isDeadLetterQueue: false,
      },
    ]);

    const service = new AwsSqsService(mockClient);
    const result = await service.getQueues();

    expect(result).toEqual(expected);
  });
});
