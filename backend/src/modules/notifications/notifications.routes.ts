import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    type: z.enum(['PUSH', 'EMAIL', 'SMS', 'IN_APP']),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
    recipientSegmentIds: z.array(z.string()).optional(),
    recipientIds: z.array(z.string()).optional(),
    data: z.record(z.any()).optional(),
    imageUrl: z.string().url().optional(),
    scheduledAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
    expiresAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
  }),
});

const registerTokenSchema = z.object({
  body: z.object({
    token: z.string(),
    platform: z.enum(['ios', 'android', 'web']),
  }),
});

const unregisterTokenSchema = z.object({
  body: z.object({
    token: z.string(),
  }),
});

// Member routes (any authenticated user)
router.get('/me', notificationsController.getMyNotifications);
router.post('/tokens/register', validate(registerTokenSchema), notificationsController.registerPushToken);
router.post('/tokens/unregister', validate(unregisterTokenSchema), notificationsController.unregisterPushToken);

// Admin routes
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), notificationsController.getNotifications);
router.get('/statistics', authorize('ADMIN', 'SUPER_ADMIN'), notificationsController.getStatistics);
router.get('/:id', authorize('ADMIN', 'SUPER_ADMIN'), notificationsController.getNotificationById);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), validate(createNotificationSchema), notificationsController.createNotification);
router.post('/:id/send', authorize('ADMIN', 'SUPER_ADMIN'), notificationsController.sendNotification);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), notificationsController.cancelNotification);

export default router;
