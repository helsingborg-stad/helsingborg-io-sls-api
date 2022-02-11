import { loginMicrosoftUrl } from '../constants';

export default function getJwksUrl(tid: string, aud: string) {
  return `${loginMicrosoftUrl}/${tid}/discovery/v2.0/keys?appid=${aud}`;
}
