import * as request from '../../../libs/request';

export default async (url, apikey, body) => {
  try {
    const requestClient = request.requestClient(
      { rejectUnauthorized: false },
      { 'X-ApiKey': apikey }
    );

    const response = await request.call(requestClient, 'post', url, body);
    return response;
  } catch (error) {
    throw new Error(error);
  }
};
