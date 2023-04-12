import log from '../libs/logs';
import { wrappers } from '../libs/lambdaWrapper';
import type { VadaError } from '../types/vadaResponse';

export interface LambdaRequest {
  messageId: string;
  caseId: string;
  errorDetails: VadaError;
  errorCode: string;
}

type FunctionResponse = Promise<boolean>;

export async function handleApplicationSubmitWithError(input: LambdaRequest): FunctionResponse {
  log.writeInfo('handleApplicationSubmitWithError', input);
  return true;
}

export const main = wrappers.event.wrap(handleApplicationSubmitWithError, {});
