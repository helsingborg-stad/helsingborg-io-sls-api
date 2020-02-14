import logger from '@financial-times/lambda-logger';
import * as dynamoDb from '../../libs/dynamoDb';
import { success, failure } from '../../libs/response';
import { to } from '../../libs/helpers';

// list items (GET)
export const main = async (event, context) => {
  const { userId } = event.queryStringParameters;

  const params = {
    TableName: 'submissions',
    KeyConditionExpression: 'userId = :user',
    ExpressionAttributeValues: { ':user': userId },
  };

  const { ok, result } = await to(dynamoDb.call('query', params));
  logger.info(result);

  if (!ok) {
    logger.error(result);
    return failure({ status: ok, error: result });
  }

  if (result.Items.length < 1) {
    return failure({ status: false, error: 'Items not found.' });
  }

  return success(result.Items);
};
