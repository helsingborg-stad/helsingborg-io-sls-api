import { Context } from 'aws-lambda';

import ErrorTransformerFactory from './errorTransformerFactory';
import * as response from './response';
import log from './logs';

function httpErrorWrapper<LambdaEvent, LambdaResponse>(
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
  lambda: (event: LambdaEvent, context: Context) => Promise<LambdaResponse>
) {
  return async (event: LambdaEvent, context: Context) => {
    try {
      const result = await lambda(event, context);
      return response.success(200, {
        attributes: result,
      });
    } catch (error) {
      return response.failure(error);
    }
  };
}

function lambdaWrapper<LambdaEvent, LambdaResponse, Dependencies>(
  lambda: (event: LambdaEvent, dependencies: Dependencies) => Promise<LambdaResponse>,
  dependencies: Dependencies
) {
  return log.wrap(
    httpResponseWrapper<LambdaEvent, LambdaResponse>(
      httpErrorWrapper(event => {
        return lambda(event, dependencies);
      })
    )
  );
}

export default lambdaWrapper;
