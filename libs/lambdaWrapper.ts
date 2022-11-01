import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';

import { successHandlers, errorHandlers, inputTransformers } from './lambdaWrappers.helpers';
import transformError from './errorTransformerFactory';
import * as response from './response';
import log from './logs';
import type {
  LambdaInvocationConfig,
  LambdaWrapper,
  LambdaFunction,
  LambdaMainExport,
} from './lambdaWrapper.types';

/** @deprecated */
function httpErrorWrapper<LambdaEvent, LambdaResponse>(
  lambda: (event: LambdaEvent, context: Context) => Promise<LambdaResponse>
) {
  return async (event: LambdaEvent, context: Context) => {
    try {
      const result = await lambda(event, context);
      return result;
    } catch (error) {
      const transformedError = transformError(error);

      throw transformedError;
    }
  };
}

/** @deprecated */
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

/** @deprecated prefer wrappers.*.wrap(...). */
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

async function invokeLambda<
  TEventType,
  TDependencies,
  TLambdaOutput,
  TEventResult = TLambdaOutput,
  TLambdaInput = TEventType
>({
  lambda,
  event,
  context,
  dependencies,
  onSuccess,
  onError,
  inputTransformer,
}: LambdaInvocationConfig<
  TEventType,
  TDependencies,
  TLambdaOutput,
  TLambdaInput,
  TEventResult
>): Promise<TEventResult> {
  try {
    log.initialize(event, context);
    const input = inputTransformer ? inputTransformer(event) : (event as unknown as TLambdaInput);
    const result = await lambda(input, dependencies);
    const eventResult = onSuccess(result);
    log.finalize(eventResult, null);
    return eventResult;
  } catch (error) {
    const transformedError = transformError(error);
    const eventResult = onError(transformedError);
    log.finalize(null, transformedError);
    if (eventResult instanceof Error) {
      throw eventResult;
    }
    return eventResult;
  }
}

export const wrappers = {
  event: <LambdaWrapper<unknown, boolean, boolean>>{
    wrap<TLambdaInput, TDependencies>(
      lambda: LambdaFunction<TLambdaInput, TDependencies, boolean>,
      dependencies: TDependencies
    ): LambdaMainExport<TLambdaInput, boolean> {
      return function (event, context) {
        return invokeLambda({
          lambda,
          event,
          context,
          dependencies,
          onSuccess: successHandlers.returnAsIs,
          onError: errorHandlers.returnAsIs,
        });
      };
    },
  },

  restRaw: <LambdaWrapper<APIGatewayEvent, APIGatewayProxyResult, string>>{
    wrap<TLambdaInput, TDependencies>(
      lambda: LambdaFunction<TLambdaInput, TDependencies, string>,
      dependencies: TDependencies
    ): LambdaMainExport<APIGatewayEvent, APIGatewayProxyResult> {
      return function (event, context) {
        return invokeLambda({
          lambda,
          event,
          context,
          dependencies,
          inputTransformer: inputTransformers.fromApiGatewayEvent,
          onSuccess: successHandlers.asRawApiResponse,
          onError: errorHandlers.asApiResponse,
        });
      };
    },
  },

  restJSON: <LambdaWrapper<APIGatewayEvent, APIGatewayProxyResult, unknown>>{
    wrap<TLambdaInput, TDependencies>(
      lambda: LambdaFunction<TLambdaInput, TDependencies, unknown>,
      dependencies: TDependencies
    ): LambdaMainExport<APIGatewayEvent, APIGatewayProxyResult> {
      return function (event, context) {
        return invokeLambda({
          lambda,
          event,
          context,
          dependencies,
          inputTransformer: inputTransformers.fromApiGatewayEvent,
          onSuccess: successHandlers.asApiResponse,
          onError: errorHandlers.asApiResponse,
        });
      };
    },
  },
};
