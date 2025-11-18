import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './shared/middleware/error.middleware';
import { websocketService } from './shared/services/websocket.service';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import membersRoutes from './modules/members/members.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import eventsRoutes from './modules/events/events.routes';
import feedRoutes from './modules/feed/feed.routes';
import segmentsRoutes from './modules/segments/segments.routes';
import teeTimeRoutes from './modules/teetime/teetime.routes';
import paymentRoutes, { webhookRouter } from './modules/payments/payment.routes';
import pcCaddieSyncRoutes from './modules/pccaddie/pccaddie-sync.routes';
import handicapRoutes from './modules/handicap/handicap.routes';
import qrCheckInRoutes from './modules/qr-checkin/qr-checkin.routes';
import tournamentRoutes from './modules/tournament/tournament.routes';

const app = express();
const httpServer = createServer(app);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  })
);

// Stripe webhook (BEFORE express.json - needs raw body)
app.use('/api/v1', webhookRouter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);

// ============================================================================
// ROUTES
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    name: 'Golf Engagement API',
    version: env.API_VERSION,
    status: 'running',
    environment: env.NODE_ENV,
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/members', membersRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/events', eventsRoutes);
apiRouter.use('/feed', feedRoutes);
apiRouter.use('/segments', segmentsRoutes);
apiRouter.use('/tee-times', teeTimeRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/pccaddie', pcCaddieSyncRoutes);
apiRouter.use('/handicap', handicapRoutes);
apiRouter.use('/qr', qrCheckInRoutes);
apiRouter.use('/tournaments', tournamentRoutes);

app.use(`/api/${env.API_VERSION}`, apiRouter);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// START SERVER & WEBSOCKET
// ============================================================================

const PORT = env.PORT || 3000;

// Initialize WebSocket server
websocketService.initialize(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`🚀 Golf Engagement API running on port ${PORT}`);
  logger.info(`📝 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 API Version: ${env.API_VERSION}`);
  logger.info(`📍 http://localhost:${PORT}`);
  logger.info(`🔌 WebSocket enabled on ws://localhost:${PORT}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
