import {
  GetQueueAttributesCommand,
  ListDeadLetterSourceQueuesCommand,
  ListQueuesCommand,
} from '@aws-sdk/client-sqs';

import { executePaginated } from '../awsHelper';
import { getFriendlyQueueName } from './sqsHelper';
import { isValid, mapAsync } from '../functionalHelper';

import type { ListQueuesCommandOutput, SQSClient } from '@aws-sdk/client-sqs';
import type { SqsService, Queue } from './sqs.types';

export class AwsSqsService implements SqsService {
  private sqsClient: SQSClient;

  constructor(sqsClient: SQSClient) {
    this.sqsClient = sqsClient;
  }

  async getQueues(): Promise<Queue[]> {
    const queueUrlsLists = await executePaginated<ListQueuesCommandOutput, string[] | undefined>(
      this.sqsClient,
      NextToken => new ListQueuesCommand({ NextToken }),
      response => response.QueueUrls
    );

    const queueNames = queueUrlsLists.filter(isValid).flat();
    const queues = await mapAsync<string, Queue>(queueNames, async queueName => ({
      name: getFriendlyQueueName(queueName),
      isDeadLetterQueue: await this.isDeadLetterQueue(queueName),
      approximateMessageCount: await this.getQueueApproximateMessageCount(queueName),
    }));

    return queues;
  }

  private async isDeadLetterQueue(maybeDeadLetterQueueUrl: string): Promise<boolean> {
    const command = new ListDeadLetterSourceQueuesCommand({
      QueueUrl: maybeDeadLetterQueueUrl,
    });
    const result = await this.sqsClient.send(command);
    return !!result.queueUrls && result.queueUrls.length > 0;
  }

  private async getQueueApproximateMessageCount(queueUrl: string): Promise<number> {
    const command = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages'],
    });

    const result = await this.sqsClient.send(command);
    return parseInt(result.Attributes?.['ApproximateNumberOfMessages'] ?? '-1', 10);
  }
}
