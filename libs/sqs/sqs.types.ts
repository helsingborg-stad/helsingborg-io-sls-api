export interface Queue {
  name: string;
  isDeadLetterQueue: boolean;
  approximateMessageCount: number;
}

export interface SqsService {
  getQueues(): Promise<Queue[]>;
}
