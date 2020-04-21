import { signToken } from '../helpers/token';

export const main = async event => {
  const jsonRequest = JSON.parse(event.body);
  const token = signToken(jsonRequest);

  return {
    statusCode: 200,
    body: JSON.stringify({
      accessToken: token,
    }),
  };
};
