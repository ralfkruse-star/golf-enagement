import { Router } from 'express';
import { pcCaddieSyncController } from './pccaddie-sync.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requireRole } from '../../shared/middleware/role.middleware';

const router = Router();

// All routes require admin authentication
router.post(
  '/sync',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  pcCaddieSyncController.triggerSync.bind(pcCaddieSyncController)
);

router.post(
  '/sync/members',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  pcCaddieSyncController.syncMembers.bind(pcCaddieSyncController)
);

router.post(
  '/sync/tournaments',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  pcCaddieSyncController.syncTournaments.bind(pcCaddieSyncController)
);

router.post(
  '/sync/handicaps',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  pcCaddieSyncController.syncHandicaps.bind(pcCaddieSyncController)
);

router.get(
  '/stats',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  pcCaddieSyncController.getStats.bind(pcCaddieSyncController)
);

export default router;
