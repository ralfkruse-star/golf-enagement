import { Router } from 'express';
import { teeTimeController } from './teetime.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requireRole } from '../../shared/middleware/role.middleware';

const router = Router();

// Public/Member routes
router.get('/', authenticate, teeTimeController.getSlots.bind(teeTimeController));
router.post('/:slotId/book', authenticate, teeTimeController.bookSlot.bind(teeTimeController));
router.delete('/bookings/:bookingId', authenticate, teeTimeController.cancelBooking.bind(teeTimeController));
router.get('/bookings/me', authenticate, teeTimeController.getMyBookings.bind(teeTimeController));

// Admin routes
router.post(
  '/admin/generate',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  teeTimeController.generateSlots.bind(teeTimeController)
);

router.post(
  '/admin/:slotId/block',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  teeTimeController.blockSlot.bind(teeTimeController)
);

router.delete(
  '/admin/:slotId/block',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  teeTimeController.unblockSlot.bind(teeTimeController)
);

router.get(
  '/statistics',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  teeTimeController.getStatistics.bind(teeTimeController)
);

export default router;
