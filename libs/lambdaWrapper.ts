import type { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';

import type { LambdaError } from './errorTransformerFactory';
import transformError from './errorTransformerFactory';
import * as response from './response';
import log from './logs';

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

type LambdaMainExport<TEventType, TReturnType> = (
  event: TEventType,
  context: Context
) => Promise<TReturnType>;

type LambdaFunction<TLambdaInput, TDependencies, TLambdaOutput> = (
  input: TLambdaInput,
  dependencies: TDependencies
) => Promise<TLambdaOutput>;

interface LambdaWrapper<TEventType, TReturnType> {
  wrap<TLambdaInput, TDependencies>(
    lambda: LambdaFunction<TLambdaInput, TDependencies, unknown>,
    dependencies: unknown
  ): LambdaMainExport<TEventType, TReturnType>;
}

interface LambdaInvocationConfig<
  TEventType,
  TDependencies,
  TLambdaOutput,
  TLambdaInput = TEventType,
  TEventResult = TLambdaOutput
> {
  lambda: LambdaFunction<TLambdaInput, TDependencies, TLambdaOutput>;
  event: TEventType;
  context: Context;
  dependencies: TDependencies;
  onSuccess: (result: TLambdaOutput) => TEventResult;
  onError: (error: LambdaError) => TEventResult;
  inputTransformer?: (event: TEventType) => TLambdaInput;
}

const inputTransformers = {
  fromApiGatewayEvent<TOutputType>(event: APIGatewayEvent): TOutputType {
    return {
      ...JSON.parse(event.body ?? '{}'),
      ...event.queryStringParameters,
    } as unknown as TOutputType;
  },
};

const successHandlers = {
  returnAsIs<TValue>(value: TValue): TValue {
    return value;
  },
  asApiResponse<TValue>(value: TValue): APIGatewayProxyResult {
    return response.success(200, value);
  },
  asRawApiResponse(value: string): APIGatewayProxyResult {
    return response.successRaw(200, value);
  },
};

const errorHandlers = {
  throwAsIs<TError extends LambdaError>(error: TError): never {
    throw error;
  },
  asApiResponse<TError extends LambdaError>(error: TError): APIGatewayProxyResult {
    return response.failure(error);
  },
};

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
    log.finalize(null, transformedError);
    const eventResult = onError(transformedError);
    return eventResult;
  }
}

export const wrappers = {
  event: <LambdaWrapper<unknown, boolean>>{
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
          onError: errorHandlers.throwAsIs,
        });
      };
    },
  },

  restRaw: <LambdaWrapper<APIGatewayEvent, APIGatewayProxyResult>>{
    wrap<TLambdaInput, TDependencies>(
      lambda: LambdaFunction<TLambdaInput, TDependencies, string>,
      dependencies: TDependencies
    ): LambdaMainExport<APIGatewayEvent, APIGatewayProxyResult> {
      return async function (event, context) {
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

  restJSON: <LambdaWrapper<APIGatewayEvent, APIGatewayProxyResult>>{
    wrap<TLambdaInput, TDependencies>(
      lambda: LambdaFunction<TLambdaInput, TDependencies, unknown>,
      dependencies: TDependencies
    ): LambdaMainExport<APIGatewayEvent, APIGatewayProxyResult> {
      return async function (event, context) {
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
