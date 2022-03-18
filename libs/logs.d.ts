import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
  APIGatewayProxyCallback,
} from 'aws-lambda';

type LambdaHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
  callback?: APIGatewayProxyCallback
) => Promise<APIGatewayProxyResult>;

type Primitive = string | number;
type Level = 'info' | 'error' | 'warn' | 'verbose' | 'debug';

declare namespace log {
  function writeLog(level: Level, message: string, customData?: unknown): void;
  function writeError(message: string, customData?: unknown): void;
  function writeWarn(message: string, customData?: unknown): void;
  function writeInfo(message: string, customData?: unknown): void;
  function writeVerbose(message: string, customData?: unknown): void;
  function writeDebug(message: string, customData?: unknown): void;
  function log(
    level: Level,
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  function error(
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  function warn(
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  function info(
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  function verbose(
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  function debug(
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  function wrap(lambda: LambdaHandler): LambdaHandler;
}

export default log;
