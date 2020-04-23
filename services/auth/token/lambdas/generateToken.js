import { signToken } from '../helpers/token';

export async function main(event) {
  const jsonRequest = JSON.parse(event.body);
  const token = signToken(jsonRequest);

  return {
    statusCode: 200,
    body: JSON.stringify({
      accessToken: token,
    }),
  };
}
