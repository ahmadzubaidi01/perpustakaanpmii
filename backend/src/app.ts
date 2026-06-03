import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import env from './config/environment';
import apiRoutes from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { realtimeLogger } from './middleware/logger';
import { trackRequestMiddleware } from './middleware/requestTracker';
import logsRoute from './routes/logs';
import { authenticate } from './middleware/auth';
import { requireMinRole } from './middleware/rbac';
import { UserRole } from './config/constants';

const app: Application = express();
app.set('trust proxy', 1);

// Mount logs dashboard route (before tracking to avoid self-logging)
app.use('/logs', authenticate, requireMinRole(UserRole.SUPER_ADMIN), logsRoute);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Name'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// Realtime Monitoring & Tracking Middleware
app.use(trackRequestMiddleware);
app.use(realtimeLogger);

// Serve uploaded files (prevent direct executable access)
const upload_path = path.resolve(__dirname, '..', env.UPLOAD_DIR);

if (!fs.existsSync(upload_path)) {
  fs.mkdirSync(upload_path, { recursive: true });
}

app.use('/uploads', express.static(upload_path, {
  dotfiles: 'deny',
  index: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
  },
}));

// API routes
app.use('/api', apiRoutes);

// Root health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: `${env.APP_NAME} API is running`,
    data: { environment: env.NODE_ENV, timestamp: new Date().toISOString() },
    error: null,
    metadata: null,
  });
});

// 404 handler
app.use(notFoundHandler);

// Centralized error handler (MUST be last)
app.use(errorHandler);

export default app;
