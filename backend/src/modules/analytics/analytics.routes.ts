import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();

/**
 * Analytics Routes
 * Base path: /api/v1/analytics
 * All routes require ADMIN role
 */

router.get(
  '/dashboard',
  authenticate,
  requireRole('ADMIN'),
  analyticsController.getDashboardOverview.bind(analyticsController)
);

router.get(
  '/members',
  authenticate,
  requireRole('ADMIN'),
  analyticsController.getMemberAnalytics.bind(analyticsController)
);

router.get(
  '/events',
  authenticate,
  requireRole('ADMIN'),
  analyticsController.getEventAnalytics.bind(analyticsController)
);

router.get(
  '/engagement',
  authenticate,
  requireRole('ADMIN'),
  analyticsController.getEngagementAnalytics.bind(analyticsController)
);

router.get(
  '/revenue',
  authenticate,
  requireRole('ADMIN'),
  analyticsController.getRevenueAnalytics.bind(analyticsController)
);

router.get(
  '/time-series',
  authenticate,
  requireRole('ADMIN'),
  analyticsController.getTimeSeriesData.bind(analyticsController)
);

router.get(
  '/top-performers',
  authenticate,
  requireRole('ADMIN'),
  analyticsController.getTopPerformers.bind(analyticsController)
);

export default router;
