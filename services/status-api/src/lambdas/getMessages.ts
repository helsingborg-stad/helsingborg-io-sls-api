import * as response from '../libs/response';
import params from '../libs/params';
import log from '../libs/logs';
import config from '../libs/config';

enum MessageType {
  Info = 'info',
  Maintenance = 'maintenance',
}

interface MessageItem {
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

const now = Date.now();

const mockMessages = [
  {
    message: {
      title: 'Hello',
      text: 'World',
    },
    type: MessageType.Info,
    start: '2022-11-14T00:00:00.000+01:00',
    expiry: '2022-11-14T23:59:59.999+01:00',
  },
  {
    message: {
      title: 'Hello',
      text: 'World',
    },
    type: MessageType.Maintenance,
    start: '2022-11-22T15:00:00.000+01:00',
    expiry: '2022-11-22T16:00:00.000+01:00',
  },
];

function messageFilter({ start, expiry }: MessageItem): boolean {
  const startTime = new Date(start).getTime();
  const expiryTime = new Date(expiry).getTime();
  return now >= startTime && now <= expiryTime;
}

export async function getMessages(dependencies: Dependencies) {
  const statusMessages = await dependencies.readParams(config.statusMessages.envsKeyName);
  const messages: MessageItem[] = statusMessages.filter(messageFilter);
  return response.success(200, { messages });
}

export const main = log.wrap(() => {
  return getMessages({
    readParams: params.read,
  });
});
