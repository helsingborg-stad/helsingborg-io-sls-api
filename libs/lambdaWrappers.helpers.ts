import type { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';

import { success, successRaw, failure } from './response';
import type { LambdaError } from './errorTransformerFactory';

export const inputTransformers = {
  fromApiGatewayEvent<TOutputType>(event: APIGatewayEvent): TOutputType {
    return {
      ...JSON.parse(event.body ?? '{}'),
      ...event.queryStringParameters,
    } as unknown as TOutputType;
  },
};

export const successHandlers = {
  returnAsIs<TValue>(value: TValue): TValue {
    return value;
  },
  asApiResponse<TValue>(value: TValue): APIGatewayProxyResult {
    return success(200, value);
  },
  asRawApiResponse(value: string): APIGatewayProxyResult {
    return successRaw(200, value);
  },
};

export const errorHandlers = {
  returnAsIs<TError extends LambdaError>(error: TError): LambdaError {
    return error;
  },
  asApiResponse<TError extends LambdaError>(error: TError): APIGatewayProxyResult {
    return failure(error);
  },
};
