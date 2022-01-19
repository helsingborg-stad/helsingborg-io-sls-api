import * as response from '../../../libs/response';

export async function main() {
  const message = process.env.message || '';

  return response.success(200, { message });
}
