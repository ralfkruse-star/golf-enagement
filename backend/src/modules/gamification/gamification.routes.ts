import { Router } from 'express';
import { gamificationController } from './gamification.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();

/**
 * Gamification Routes
 * Base path: /api/v1/gamification
 */

// Public/Member routes
router.get(
  '/leaderboard',
  authenticate,
  gamificationController.getLeaderboard.bind(gamificationController)
);

router.get(
  '/stats/me',
  authenticate,
  gamificationController.getMyStats.bind(gamificationController)
);

// Admin routes
router.get(
  '/stats/:memberId',
  authenticate,
  requireRole('ADMIN'),
  gamificationController.getMemberStats.bind(gamificationController)
);

router.post(
  '/achievements/check/:memberId',
  authenticate,
  requireRole('ADMIN'),
  gamificationController.checkAchievements.bind(gamificationController)
);

// Super admin routes
router.post(
  '/achievements/check-all',
  authenticate,
  requireRole('SUPER_ADMIN'),
  gamificationController.checkAllAchievements.bind(gamificationController)
);

export default router;
