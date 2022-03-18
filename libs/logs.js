import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

let requestId = 'N/A';

const log = {
  writeLog: (level, message, customData = {}) => {
    logger.log(level, message, {
      requestId,
      customData,
    });
  },

  log: (level, message, requestId, errorCode, customData = {}) => {
    logger.log(level, message, {
      errorCode,
      requestId,
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
    requestId = context.awsRequestId;
    log.writeInfo('Lambda initialize', {
      source: event.source,
      detailType: event['detail-type'],
      path: event.path,
      method: event.httpMethod,
      pathParameters: event.pathParameters,
      queryStringParameters: event.queryStringParameters,
    });
  },

  finalize: (response, error) => {
    log.writeInfo('Lambda finalize', {
      statusCode: response?.statusCode ?? 0,
      error,
    });
  },

  wrap: lambda => {
    return (event, context, callback) => {
      log.initialize(event, context);

      const executor = lambda(event, context, (error, response) => {
        log.finalize(response, error);
        callback(error, response);
      });

      if (!(executor instanceof Promise)) {
        return undefined;
      }

      const promise = new Promise((resolve, reject) => {
        executor
          .then(response => {
            log.finalize(response);
            resolve(response);
          })
          .catch(error => {
            log.finalize(null, error);
            reject(error);
          });
      });
      return promise;
    };
  },
};

export default log;
