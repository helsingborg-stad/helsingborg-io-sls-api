import { loginMicrosoftUrl } from '../constants';

export default function getJwksUrl(tid, aud) {
  return `${loginMicrosoftUrl}/${tid}/discovery/v2.0/keys?appid=${aud}`;
}
