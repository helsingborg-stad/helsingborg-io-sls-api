import * as response from '../libs/response';
import params from '../libs/params';
import log from '../libs/logs';
import config from '../libs/config';

export enum MessageType {
  Info = 'info',
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

function betweenDateFilter({ start, expiry }: MessageItem): boolean {
  const now = Date.now();
  const startTime = new Date(start).getTime();
  const expiryTime = new Date(expiry).getTime();
  return now >= startTime && now <= expiryTime;
}

function getStatusMessages(): Promise<MessageItem[]> {
  return params.read(config.status.messages.envsKeyName);
}

export async function getMessages(dependencies: Dependencies) {
  const statusMessages = await dependencies.getStatusMessages();
  const messages: MessageItem[] = statusMessages.filter(betweenDateFilter);
  return response.success(200, { messages });
}

export const main = log.wrap(() => {
  return getMessages({
    getStatusMessages,
  });
});
