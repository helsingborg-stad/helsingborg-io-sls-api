import type { Context } from 'aws-lambda';
import type { LambdaError } from './errorTransformerFactory';

export type LambdaMainExport<TEventType, TReturnType> = (
  event: TEventType,
  context: Context
) => Promise<TReturnType>;

export type LambdaFunction<TLambdaInput, TDependencies, TLambdaOutput> = (
  input: TLambdaInput,
  dependencies: TDependencies
) => Promise<TLambdaOutput>;

export interface LambdaWrapper<TEventType, TReturnType, TLambdaOutput> {
  wrap<TLambdaInput, TDependencies>(
    lambda: LambdaFunction<TLambdaInput, TDependencies, TLambdaOutput>,
    dependencies: TDependencies
  ): LambdaMainExport<TEventType, TReturnType>;
}

export interface LambdaInvocationConfig<
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
  onError: (error: LambdaError) => TEventResult | Error;
  inputTransformer?: (event: TEventType) => TLambdaInput;
}
