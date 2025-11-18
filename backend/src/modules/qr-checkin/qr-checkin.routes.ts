import { Router } from 'express';
import { qrCheckInController } from './qr-checkin.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requireRole } from '../../shared/middleware/role.middleware';

const router = Router();

// Member routes
router.post('/event', authenticate, qrCheckInController.generateEventQR.bind(qrCheckInController));
router.post('/teetime', authenticate, qrCheckInController.generateTeeTimeQR.bind(qrCheckInController));
router.get('/next-event', authenticate, qrCheckInController.getMyNextEventQR.bind(qrCheckInController));
router.get('/next-teetime', authenticate, qrCheckInController.getMyNextTeeTimeQR.bind(qrCheckInController));

// Admin/Staff routes (for check-in scanner)
router.post(
  '/checkin',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  qrCheckInController.processCheckIn.bind(qrCheckInController)
);

export default router;
