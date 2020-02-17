import logger from '@financial-times/lambda-logger';
import * as dynamoDb from '../../libs/dynamoDb';
import { success, failure } from '../../libs/response';
import { to } from '../../libs/helpers';

// update (PUT)
export const main = async (event, context) => {
  const data = JSON.parse(event.body);

  const { userId } = event.queryStringParameters;
  const { submissionId } = event.pathParameters;

  const params = {
    TableName: 'submissions',
    Key: {
      userId,
      submissionId,
    },
    UpdateExpression: 'SET answers = :answers, modified = :modified',
    ExpressionAttributeValues: {
      ':answers': data.answers || null,
      ':modified': Date.now(),
    },
    ReturnValues: 'ALL_NEW',
  };

  const { ok, result } = await to(dynamoDb.call('update', params));

  if (!ok) {
    logger.error(result);
    return failure({ status: ok, error: result });
  }

  return success({ status: true });
};
