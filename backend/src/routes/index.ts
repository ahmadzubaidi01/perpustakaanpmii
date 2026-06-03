import { Router, Request, Response } from 'express';
import v1Routes from './v1';
import sequelize from '../config/database';
import { deviceTracker } from '../middleware/deviceTracker';

const router = Router();

// Apply global middleware
router.use(deviceTracker);

// Health check endpoints
router.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
  }

  const success = dbStatus === 'connected';
  res.status(success ? 200 : 503).json({
    success,
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
  });
});

// API v1 routes
router.use('/v1', v1Routes);

export default router;
