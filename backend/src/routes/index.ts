import { Router, Request, Response } from 'express';
import v1Routes from './v1';
import sequelize from '../config/database';
import { deviceTracker } from '../middleware/deviceTracker';

const router = Router();

// Apply global middleware
router.use(deviceTracker);

// Health check endpoints
router.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = { api: 'healthy' };

  // Database health check
  try {
    await sequelize.authenticate();
    checks.database = 'healthy';
  } catch {
    checks.database = 'unhealthy';
  }

  const allHealthy = Object.values(checks).every((v) => v === 'healthy');
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: allHealthy,
    message: allHealthy ? 'All systems operational' : 'Some systems are unhealthy',
    data: checks,
    error: null,
    metadata: { timestamp: new Date().toISOString() },
  });
});

// API v1 routes
router.use('/v1', v1Routes);

export default router;
