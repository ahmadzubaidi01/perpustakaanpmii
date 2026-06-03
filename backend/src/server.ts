import dotenv from 'dotenv';
dotenv.config({ override: true });

import env from './config/environment';
import logger from './utils/logger';
import app from './app';
import sequelize from './config/database';
import { serverHealthMonitor } from './services/serverHealth';
import './models/index';

// Start Server Health Monitor for local development
serverHealthMonitor.start(5000);

const startServer = async () => {
  try {
    // Database connection with auto-retry logic (5 times, 2s intervals)
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
    app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`${env.APP_NAME} dev server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error: any) {
    logger.error('Failed to start dev server cleanly', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();
