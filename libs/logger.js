import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

/**
 * Log function that outputs console logs in json format.
 *
 * @param {('error'|'warn'|'info'|'http'|'verbose'|'debug'|'silly')} level Log level based on npm log level standard.
 * @param {string} message   Log message.
 * @param {string} requestId Request id to be able to filter logs on a single request.
 * @param {string} errorCode Error code for locating log in code.
 * @param {object} data      Custom data related to log.
 * @returns {void}
 */
export const log = (level, message, requestId, errorCode, customData = {}) => {
  logger.log(level, message, { errorCode: errorCode, requestId: requestId, customData: customData });
};
