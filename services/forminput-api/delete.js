import logger from '@financial-times/lambda-logger';
import * as dynamoDb from '../../libs/dynamoDb';
import { success, failure } from '../../libs/response';
import { to } from '../../libs/helpers';

// delete (DELETE)
export const main = async event => {
  const data = JSON.parse(event.body);
  const { userId } = data;

  if (!userId) {
    return failure({ status: false, error: 'Missing userId!' });
  }

  const { submissionId } = event.pathParameters;

  const params = {
    TableName: 'submissions',
    Key: {
      userId,
      submissionId,
    },
  };

  const { ok, result } = await to(dynamoDb.call('delete', params));

  if (!ok) {
    logger.error(result);
    return failure({ status: ok, error: result });
  }

  return success({ status: true });
};
