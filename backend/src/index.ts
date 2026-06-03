import dotenv from 'dotenv';
dotenv.config({ override: true });

import env from './config/environment';
import logger from './utils/logger';
import { logStream } from './services/logStream';

// Global error handlers to prevent abrupt process termination
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception captured globally', { error: error.message, stack: error.stack });
  logStream.emitLog({ type: 'ERROR', message: 'Uncaught Exception', stack: error.stack });
});

process.on('unhandledRejection', (reason: any) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error('Unhandled Rejection captured globally', { reason: msg, stack });
  logStream.emitLog({ type: 'ERROR', message: `Unhandled Rejection: ${msg}`, stack });
});

import app from './app';
import './models/index';

export default app;
