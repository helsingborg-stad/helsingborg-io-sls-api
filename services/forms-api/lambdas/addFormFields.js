import * as response from '../../../libs/response';

/**
 * Function for adding fields to an step in an existing form in dynamodb.
 */

export async function main(event) {
  return response.success({
    message: 'This is the add form fields lambda response',
  });
}
