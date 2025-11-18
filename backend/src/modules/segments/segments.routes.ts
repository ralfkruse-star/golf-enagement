import { Router } from 'express';
import { segmentsController } from './segments.controller';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createSegmentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    criteria: z.object({
      membershipType: z.array(z.enum(['FULL', 'JUNIOR', 'SENIOR', 'GUEST', 'HONORARY', 'TRIAL'])).optional(),
      membershipStatus: z.array(z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'])).optional(),
      ageRange: z.tuple([z.number(), z.number()]).optional(),
      handicapRange: z.tuple([z.number(), z.number()]).optional(),
      joinedAfter: z.string().optional().transform(val => val ? new Date(val) : undefined),
      joinedBefore: z.string().optional().transform(val => val ? new Date(val) : undefined),
      custom: z.any().optional(),
    }),
  }),
});

const updateSegmentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    criteria: z.object({
      membershipType: z.array(z.enum(['FULL', 'JUNIOR', 'SENIOR', 'GUEST', 'HONORARY', 'TRIAL'])).optional(),
      membershipStatus: z.array(z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'])).optional(),
      ageRange: z.tuple([z.number(), z.number()]).optional(),
      handicapRange: z.tuple([z.number(), z.number()]).optional(),
      joinedAfter: z.string().optional().transform(val => val ? new Date(val) : undefined),
      joinedBefore: z.string().optional().transform(val => val ? new Date(val) : undefined),
      custom: z.any().optional(),
    }).optional(),
  }),
});

// Member routes
router.get('/me', segmentsController.getMemberSegments);

// Admin routes
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), segmentsController.getSegments);
router.get('/:id', authorize('ADMIN', 'SUPER_ADMIN'), segmentsController.getSegmentById);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), validate(createSegmentSchema), segmentsController.createSegment);
router.patch('/:id', authorize('ADMIN', 'SUPER_ADMIN'), validate(updateSegmentSchema), segmentsController.updateSegment);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), segmentsController.deleteSegment);
router.post('/:id/recalculate', authorize('ADMIN', 'SUPER_ADMIN'), segmentsController.recalculateSegment);
router.post('/recalculate/all', authorize('SUPER_ADMIN'), segmentsController.recalculateAllSegments);

export default router;
