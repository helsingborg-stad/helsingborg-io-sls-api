import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

const log = {
  requestId: 'N/A',
  writeLog(level, message, customData = {}) {
    logger.log(level, message, {
      requestId: log.requestId,
      customData,
    });
  },

  // eslint-disable-next-line max-params
  log(level, message, errorCode, customData = {}) {
    logger.log(level, message, {
      errorCode,
      requestId: log.requestId,
      customData,
    });
  },

  writeError(message, customData = {}) {
    log.writeLog('error', message, customData);
  },

  // eslint-disable-next-line max-params
  error(message, requestId, errorCode, customData = {}) {
    log.log('error', message, requestId, errorCode, customData);
  },

  writeWarn(message, customData = {}) {
    log.writeLog('warn', message, customData);
  },

  // eslint-disable-next-line max-params
  warn(message, requestId, errorCode, customData = {}) {
    log.log('warn', message, requestId, errorCode, customData);
  },

  writeInfo(message, customData = {}) {
    log.writeLog('info', message, customData);
  },

  // eslint-disable-next-line max-params
  info(message, requestId, errorCode, customData = {}) {
    log.log('info', message, requestId, errorCode, customData);
  },

  writeVerbose(message, customData = {}) {
    log.writeLog('verbose', message, customData);
  },

  // eslint-disable-next-line max-params
  verbose(message, requestId, errorCode, customData = {}) {
    log.log('verbose', message, requestId, errorCode, customData);
  },

  writeDebug(message, customData = {}) {
    log.writeLog('debug', message, customData);
  },

  // eslint-disable-next-line max-params
  debug(message, requestId, errorCode, customData = {}) {
    log.log('debug', message, requestId, errorCode, customData);
  },

  initialize(event, context) {
    log.requestId = context.awsRequestId;
    log.writeInfo('Initialize lambda', {
      source: event.source,
      detailType: event['detail-type'],
      path: event.path,
      method: event.httpMethod,
      pathParameters: event.pathParameters,
      queryStringParameters: event.queryStringParameters,
      userAgent: event.headers?.['User-Agent'],
    });
  },

  finalize(response, error) {
    log.writeInfo('Finalize lambda', {
      statusCode: response?.statusCode ?? 0,
      errorMessage: error?.toString(),
      errorStack: error?.stack,
    });
  },

  wrap(lambda) {
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
