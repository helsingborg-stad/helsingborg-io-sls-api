import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

const log = {
  log: (level, message, requestId, errorCode, customData = {}) => {
    logger.log(level, message, {
      errorCode,
      requestId,
      customData,
    });
  },

  error: (message, requestId, errorCode, customData = {}) => {
    log.log('error', message, requestId, errorCode, customData);
  },

  warn: (message, requestId, errorCode, customData = {}) => {
    log.log('warn', message, requestId, errorCode, customData);
  },

  info: (message, requestId, errorCode, customData = {}) => {
    log.log('info', message, requestId, errorCode, customData);
  },

  verbose: (message, requestId, errorCode, customData = {}) => {
    log.log('verbose', message, requestId, errorCode, customData);
  },

  debug: (message, requestId, errorCode, customData = {}) => {
    log.log('debug', message, requestId, errorCode, customData);
  },
};

export default log;
