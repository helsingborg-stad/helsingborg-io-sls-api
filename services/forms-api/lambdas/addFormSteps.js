import * as response from '../../../libs/response';

/**
 * Function for adding steps to an existing form in dynamodb.
 */
export async function main(event) {
  return response.success({
    message: 'This is the add form steps lambda response',
  });
}
