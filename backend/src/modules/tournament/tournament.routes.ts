import { Router } from 'express';
import { tournamentController } from './tournament.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requireRole } from '../../shared/middleware/role.middleware';

const router = Router();

// Public routes
router.get('/active', tournamentController.getActiveTournaments.bind(tournamentController));
router.get('/:id/leaderboard', tournamentController.getLeaderboard.bind(tournamentController));

// Member routes
router.post('/:id/score', authenticate, tournamentController.submitScore.bind(tournamentController));
router.get('/:id/my-score', authenticate, tournamentController.getMyScore.bind(tournamentController));

// Admin routes
router.post(
  '/',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  tournamentController.createTournament.bind(tournamentController)
);

router.post(
  '/:id/start',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  tournamentController.startTournament.bind(tournamentController)
);

router.post(
  '/:id/end',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  tournamentController.endTournament.bind(tournamentController)
);

export default router;
