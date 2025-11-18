import { Router } from 'express';
import { handicapController } from './handicap.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requireRole } from '../../shared/middleware/role.middleware';

const router = Router();

// Member routes
router.post('/rounds', authenticate, handicapController.submitRound.bind(handicapController));
router.get('/rounds/me', authenticate, handicapController.getMyRounds.bind(handicapController));
router.get('/history/me', authenticate, handicapController.getMyHistory.bind(handicapController));
router.post('/playing-handicap', authenticate, handicapController.getPlayingHandicap.bind(handicapController));
router.delete('/rounds/:roundId', authenticate, handicapController.deleteRound.bind(handicapController));

// Admin routes
router.post(
  '/admin/rounds/:roundId/verify',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  handicapController.verifyRound.bind(handicapController)
);

router.get(
  '/admin/stats',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  handicapController.getStats.bind(handicapController)
);

router.get(
  '/members/:memberId/rounds',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  handicapController.getMemberRounds.bind(handicapController)
);

export default router;
