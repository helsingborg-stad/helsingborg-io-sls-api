import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import { objectWithoutProperties } from '../libs/objects';
import * as response from '../libs/response';
import { decodeToken } from '../libs/token';
import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import log from '../libs/logs';

export async function main(event, context) {
  const decodedToken = decodeToken(event);
  const { id } = event.pathParameters;

  const deleteCaseParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: `USER#${decodedToken.personalNumber}`,
      SK: `CASE#${id}`,
    },
    ConditionExpression: 'id = :caseId',
    ExpressionAttributeValues: {
      ':caseId': id,
    },
    ReturnValues: 'ALL_OLD',
  };

  const [error, deleteCaseResponse] = await to(sendDeleteCaseRequest(deleteCaseParams));
  if (error) {
    log.error(
      'Delete case Request error',
      context.awsRequestId,
      'service-cases-api-deleteCase-001',
      error
    );

    return response.failure(error);
  }

  const caseWithoutProperties = objectWithoutProperties(deleteCaseResponse.Attributes, [
    'PK',
    'SK',
    'GSI1',
  ]);

  return response.success(200, {
    type: 'deleteCase',
    attributes: {
      ...caseWithoutProperties,
    },
  });
}

async function sendDeleteCaseRequest(params) {
  const [error, response] = await to(dynamoDb.call('delete', params));
  if (error) {
    throwError(error.statusCode, error.message);
  }
  return response;
}
