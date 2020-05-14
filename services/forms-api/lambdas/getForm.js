import * as response from '../../../libs/response';

export async function main(event) {
  return response.success({ form: 'This is the get form lambda response' });
}
