import { Handler } from 'aws-lambda';

type Primitive = string | number | null | undefined;
type Level = 'info' | 'error' | 'warn' | 'verbose' | 'debug';

declare namespace log {
  function writeLog(level: Level, message: string, customData?: unknown): void;
  function writeError(message: string, customData?: unknown): void;
  function writeWarn(message: string, customData?: unknown): void;
  function writeInfo(message: string, customData?: unknown): void;
  function writeVerbose(message: string, customData?: unknown): void;
  function writeDebug(message: string, customData?: unknown): void;
  /**
   * @deprecated
   */
  function log(
    level: Level,
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  /**
   * @deprecated
   */
  function error(
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  /**
   * @deprecated
   */
  function warn(
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  /**
   * @deprecated
   */
  function info(
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  /**
   * @deprecated
   */
  function verbose(
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  /**
   * @deprecated
   */
  function debug(
    message: string,
    requestId: string,
    errorCode: Primitive,
    customData?: unknown
  ): void;
  function wrap(lambda: Handler): Handler;
}

export default log;
