import winston from 'winston';
import env from '../config/environment';

/**
 * Custom format that redacts sensitive credentials from logs.
 */
const redactSensitive = winston.format((info) => {
  const sensitiveKeys = [
    'password', 'password_hash', 'token', 'secret',
    'authorization', 'cookie', 'jwt', 'refresh_token',
    'reset_token', 'api_key', 'private_key',
  ];

  const redact = (obj: Record<string, unknown>): Record<string, unknown> => {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        redacted[key] = redact(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  };

  if (info.meta && typeof info.meta === 'object') {
    info.meta = redact(info.meta as Record<string, unknown>);
  }

  return info;
});

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  exitOnError: false, // Prevents winston from forcefully crashing/exiting the process on uncaught exceptions
  format: winston.format.combine(
    redactSensitive(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: env.APP_NAME },
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'production' || process.env.VERCEL
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
              const metaStr = Object.keys(meta).length > 0
                ? `\n${JSON.stringify(meta, null, 2)}`
                : '';
              return `[${timestamp}] [${service}] ${level}: ${message}${metaStr}`;
            })
          )
    })
  ]
});

export default logger;
