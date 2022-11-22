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
  readParams: (envsKeyName: string) => Promise<MessageItem[]>;
}

function messageFilter({ start, expiry }: MessageItem): boolean {
  const now = Date.now();
  const startTime = new Date(start).getTime();
  const expiryTime = new Date(expiry).getTime();
  return now >= startTime && now <= expiryTime;
}

export async function getMessages(dependencies: Dependencies) {
  const statusMessages = await dependencies.readParams(config.status.messages.envsKeyName);
  const messages: MessageItem[] = statusMessages.filter(messageFilter);
  return response.success(200, { messages });
}

export const main = log.wrap(() => {
  return getMessages({
    readParams: params.read,
  });
});
