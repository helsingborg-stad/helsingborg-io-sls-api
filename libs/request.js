import axios from 'axios';
import https from 'https';

export const requestClient = (
  options,
  timeout = 5000,
  contentType = 'application/json',
) =>
  axios.create({
    httpsAgent: new https.Agent({ ...options }),
    headers: {
      'Content-Type': contentType,
    },
    timeout,
  });

export const call = (client, method, url, payload) =>
  client[method](url, payload);
