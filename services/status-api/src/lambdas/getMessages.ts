import params from '../libs/params';
import config from '../libs/config';
import { wrappers } from '../libs/lambdaWrapper';

export enum MessageType {
  Info = 'info',
  Warning = 'warning',
  Maintenance = 'maintenance',
}

export interface MessageItem {
  readonly message: Message;
  readonly type: MessageType;
  readonly start: string;
  readonly expiry: string;
}

interface Message {
  readonly title: string;
  readonly text: string;
}

export interface Dependencies {
  getStatusMessages: () => Promise<MessageItem[]>;
}

export interface FunctionResponse {
  attributes: { messages: MessageItem[] };
}

function betweenDateFilter({ start, expiry }: MessageItem): boolean {
  const now = Date.now();
  const startTime = new Date(start).getTime();
  const expiryTime = new Date(expiry).getTime();
  return now >= startTime && now <= expiryTime;
}

function getStatusMessages(): Promise<MessageItem[]> {
  return params.read(config.status.messages.envsKeyName);
}

export async function getMessages(dependencies: Dependencies): Promise<FunctionResponse> {
  const statusMessages = await dependencies.getStatusMessages();
  const messages: MessageItem[] = statusMessages.filter(betweenDateFilter);
  return {
    attributes: {
      messages,
    },
  };
}

export const main = wrappers.restJSON.wrap(getMessages, {
  getStatusMessages,
});
