import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

export const log = (level, message, requestId, errorCode, customData = {}) => {
  logger.log(level, message, { errorCode: errorCode, requestId: requestId, customData: customData });
};

export const logError = (message, requestId, errorCode, customData = {}) => {
  log('error', message, requestId, errorCode, customData)
}

export const logWarn = (message, requestId, errorCode, customData = {}) => {
  log('warn', message, requestId, errorCode, customData)
}

export const logInfo = (message, requestId, errorCode, customData = {}) => {
  log('info', message, requestId, errorCode, customData)
}

export const logVerbose = (message, requestId, errorCode, customData = {}) => {
  log('verbose', message, requestId, errorCode, customData)
}

export const logDebug = (message, requestId, errorCode, customData = {}) => {
  log('debug', message, requestId, errorCode, customData)
}
