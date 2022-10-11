import { Context } from 'aws-lambda';

import ErrorTransformerFactory from '../libs/errorTransformerFactory';
import * as response from '../libs/response';
import log from '../libs/logs';

function httpErrorTransformer<LambdaEvent, LambdaResponse>(
  lambda: (event: LambdaEvent, context: Context) => Promise<LambdaResponse>
) {
  return async (event: LambdaEvent, context: Context) => {
    try {
      const result = await lambda(event, context);
      return result;
    } catch (error) {
      const transformedError = ErrorTransformerFactory.transformError(error);

      throw transformedError;
    }
  };
}

function httpResponseWrapper<LambdaEvent, LambdaResponse>(
  lambda: (event: LambdaEvent, context: Context) => Promise<LambdaResponse>,
  type: string
) {
  return async (event: LambdaEvent, context: Context) => {
    try {
      const result = await lambda(event, context);
      return response.success(200, {
        type,
        attributes: result,
      });
    } catch (error) {
      return response.failure(error);
    }
  };
}

function lambdaWrapper<LambdaEvent, LambdaResponse>(
  lambda: (event: LambdaEvent, context: Context) => Promise<LambdaResponse>,
  type: string
) {
  return log.wrap(
    httpResponseWrapper<LambdaEvent, LambdaResponse>(
      httpErrorTransformer((event, context) => {
        return lambda(event, context);
      }),
      type
    )
  );
}

export default lambdaWrapper;
