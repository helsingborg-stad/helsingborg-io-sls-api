import * as response from '../../../libs/response';

/**
 * Function for adding logics to an existing form in dynamodb.
 */

export async function main(event) {
  return response.success({
    message: 'This is the add form logics lambda response',
  });
}
