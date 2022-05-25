import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

const log = {
  requestId: 'N/A',
  writeLog: (level, message, customData = {}) => {
    logger.log(level, message, {
      requestId: log.requestId,
      customData,
    });
  },

  log: (level, message, requestId, errorCode, customData = {}) => {
    logger.log(level, message, {
      errorCode,
      requestId: log.requestId,
      customData,
    });
  },

  writeError: (message, customData = {}) => {
    log.writeLog('error', message, customData);
  },

  error: (message, requestId, errorCode, customData = {}) => {
    log.log('error', message, requestId, errorCode, customData);
  },

  writeWarn: (message, customData = {}) => {
    log.writeLog('warn', message, customData);
  },

  warn: (message, requestId, errorCode, customData = {}) => {
    log.log('warn', message, requestId, errorCode, customData);
  },

  writeInfo: (message, customData = {}) => {
    log.writeLog('info', message, customData);
  },

  info: (message, requestId, errorCode, customData = {}) => {
    log.log('info', message, requestId, errorCode, customData);
  },

  writeVerbose: (message, customData = {}) => {
    log.writeLog('verbose', message, customData);
  },

  verbose: (message, requestId, errorCode, customData = {}) => {
    log.log('verbose', message, requestId, errorCode, customData);
  },

  writeDebug: (message, customData = {}) => {
    log.writeLog('debug', message, customData);
  },

  debug: (message, requestId, errorCode, customData = {}) => {
    log.log('debug', message, requestId, errorCode, customData);
  },

  initialize: (event, context) => {
    log.requestId = context.awsRequestId;
    log.writeInfo('Lambda initialize', {
      source: event.source,
      detailType: event['detail-type'],
      path: event.path,
      method: event.httpMethod,
      pathParameters: event.pathParameters,
      queryStringParameters: event.queryStringParameters,
      userAgent: event.headers?.['User-Agent'],
    });
  },

  finalize: (response, error) => {
    log.writeInfo('Lambda finalize', {
      statusCode: response?.statusCode ?? 0,
      errorMessage: error?.toString(),
      errorStack: error?.stack,
    });
  },

  wrap: lambda => {
    return async (event, context) => {
      try {
        log.initialize(event, context);
        const response = await lambda(event, context);
        log.finalize(response);
        return response;
      } catch (error) {
        log.finalize(null, error);
        throw error;
      }
    };
  },
};

export default log;
