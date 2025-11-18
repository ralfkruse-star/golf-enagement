import { Router } from 'express';
import { eventsController } from './events.controller';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    type: z.enum(['TOURNAMENT', 'TRAINING', 'SOCIAL', 'MEETING', 'COURSE_MAINTENANCE', 'OTHER']),
    startDate: z.string().transform(val => new Date(val)),
    endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    location: z.string().optional(),
    maxParticipants: z.number().int().positive().optional(),
    registrationDeadline: z.string().optional().transform(val => val ? new Date(val) : undefined),
    requiresApproval: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    imageUrl: z.string().url().optional(),
    targetSegmentIds: z.array(z.string()).optional(),
  }),
});

const updateEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    type: z.enum(['TOURNAMENT', 'TRAINING', 'SOCIAL', 'MEETING', 'COURSE_MAINTENANCE', 'OTHER']).optional(),
    startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    location: z.string().optional(),
    maxParticipants: z.number().int().positive().optional(),
    registrationDeadline: z.string().optional().transform(val => val ? new Date(val) : undefined),
    requiresApproval: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    imageUrl: z.string().url().optional(),
    targetSegmentIds: z.array(z.string()).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
  }),
});

const registerSchema = z.object({
  body: z.object({
    comment: z.string().optional(),
  }),
});

// Public routes (any authenticated member)
router.get('/', eventsController.getEvents);
router.get('/:id', eventsController.getEventById);
router.post('/:id/register', validate(registerSchema), eventsController.registerForEvent);
router.delete('/:id/register', eventsController.cancelRegistration);

// Admin routes
router.get('/statistics/overview', authorize('ADMIN', 'SUPER_ADMIN'), eventsController.getStatistics);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), validate(createEventSchema), eventsController.createEvent);
router.patch('/:id', authorize('ADMIN', 'SUPER_ADMIN'), validate(updateEventSchema), eventsController.updateEvent);
router.post('/:id/publish', authorize('ADMIN', 'SUPER_ADMIN'), eventsController.publishEvent);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), eventsController.deleteEvent);

export default router;
