import logger from '@financial-times/lambda-logger';
import * as dynamoDb from '../../libs/dynamoDb';
import { success, failure } from '../../libs/response';
import { to } from '../../libs/helpers';

// get item (GET)
export const main = async (event, context) => {
  const { userId } = event.queryStringParameters;
  const { submissionId } = event.pathParameters;

  const params = {
    TableName: 'submissions',
    Key: {
      userId,
      submissionId,
    },
  };

  const { ok, result } = await to(dynamoDb.call('get', params));

  if (!ok) {
    logger.error(result);
    return failure({ status: ok, error: result });
  }

  if (!result.Item) {
    return failure({ status: false, error: 'Item not found.' });
  }

  return success(result.Item);
};
