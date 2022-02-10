export default log;
declare namespace log {
    function log(level: any, message: any, requestId: any, errorCode: any, customData?: {}): void;
    function error(message: any, requestId: any, errorCode: any, customData?: {}): void;
    function warn(message: any, requestId: any, errorCode: any, customData?: {}): void;
    function info(message: any, requestId: any, errorCode: any, customData?: {}): void;
    function verbose(message: any, requestId: any, errorCode: any, customData?: {}): void;
    function debug(message: any, requestId: any, errorCode: any, customData?: {}): void;
}
