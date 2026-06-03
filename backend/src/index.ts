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

import http from 'http';
import fs from 'fs';
import path from 'path';
import app from './app';
import sequelize from './config/database';
import { serverHealthMonitor } from './services/serverHealth';

// Import models to initialize associations
import './models/index';

const httpServer = http.createServer(app);

// Start Server Health Monitor
serverHealthMonitor.start(5000);

// Start server
const startServer = async () => {
  try {
    // Database connection with defensive auto-retry logic (5 times, 2s intervals)
    let dbRetries = 5;
    while (dbRetries > 0) {
      try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully');
        break;
      } catch (err: any) {
        dbRetries -= 1;
        logger.warn(`Database connection failed. Retries remaining: ${dbRetries}. Error: ${err.message}`);
        if (dbRetries === 0) {
          throw new Error(`Critical: Database connection failed after multiple retries. ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Start listening HTTP Server
    httpServer.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`${env.APP_NAME} server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error: any) {
    logger.error('Failed to start server cleanly', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown sequence...`);

  // Force shutdown backup timer (10s)
  const shutdownTimer = setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded, forcing process exit');
    process.exit(1);
  }, 10000);

  // Close HTTP server
  httpServer.close(async () => {
    logger.info('HTTP server shut down cleanly');

    // Stop health monitor
    serverHealthMonitor.stop();

    // Close Database pool connections
    try {
      await sequelize.close();
      logger.info('Sequelize database connection pool successfully closed');
    } catch (err: any) {
      logger.error('Error closing database connections during shutdown', { error: err.message });
    }

    clearTimeout(shutdownTimer);
    logger.info('Graceful shutdown completed successfully. Good bye!');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;
