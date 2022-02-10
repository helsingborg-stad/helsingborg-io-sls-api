/* eslint-disable @typescript-eslint/no-explicit-any */
export default log;
declare namespace log {
  function log(level: any, message: any, requestId: any, errorCode: any, customData?: any): void;
  function error(message: any, requestId: any, errorCode: any, customData?: any): void;
  function warn(message: any, requestId: any, errorCode: any, customData?: any): void;
  function info(message: any, requestId: any, errorCode: any, customData?: any): void;
  function verbose(message: any, requestId: any, errorCode: any, customData?: any): void;
  function debug(message: any, requestId: any, errorCode: any, customData?: any): void;
}
