import { Router } from 'express';
import { membersController } from './members.controller';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public member routes (any authenticated user)
router.get('/me', membersController.getMe);
router.patch('/me', membersController.updateMe);

// Admin routes
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), membersController.getMembers);
router.get('/statistics', authorize('ADMIN', 'SUPER_ADMIN'), membersController.getStatistics);
router.get('/:id', authorize('ADMIN', 'SUPER_ADMIN'), membersController.getMemberById);
router.patch('/:id', authorize('ADMIN', 'SUPER_ADMIN'), membersController.updateMember);
router.patch('/:id/status', authorize('ADMIN', 'SUPER_ADMIN'), membersController.updateMemberStatus);
router.delete('/:id', authorize('SUPER_ADMIN'), membersController.deleteMember);

export default router;
