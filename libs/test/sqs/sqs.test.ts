import { getFriendlyQueueName } from '../../sqs/sqsHelper';

describe('SQS Helper', () => {
  describe('getFriendlyQueueName', () => {
    it.each([
      ['http://example.com/000000000000/my-dlq', 'my-dlq'],
      ['myQueue', 'myQueue'],
    ])("returns '%s' for '%s'", (raw, friendlyName) => {
      const result = getFriendlyQueueName(raw);
      expect(result).toBe(friendlyName);
    });
  });
});
