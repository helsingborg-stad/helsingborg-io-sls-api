import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

export const log = {
  log: (level, message, requestId, errorCode, customData = {}) => {
    logger.log(level, message, {
      errorCode: errorCode,
      requestId: requestId,
      customData: customData,
    });
  },

  error: (message, requestId, errorCode, customData = {}) => {
    this.log('error', message, requestId, errorCode, customData);
  },

  warn: (message, requestId, errorCode, customData = {}) => {
    this.log('warn', message, requestId, errorCode, customData);
  },

  info: (message, requestId, errorCode, customData = {}) => {
    this.log('info', message, requestId, errorCode, customData);
  },

  verbose: (message, requestId, errorCode, customData = {}) => {
    this.log('verbose', message, requestId, errorCode, customData);
  },

  debug: (message, requestId, errorCode, customData = {}) => {
    this.log('debug', message, requestId, errorCode, customData);
  },
};
