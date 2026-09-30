import winston from 'winston';

const level = process.env.LOG_LEVEL ?? 'info';

export const logger = winston.createLogger({
  level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level: lvl, message }) =>
        `${timestamp} [${lvl}] ${message}`,
    ),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
