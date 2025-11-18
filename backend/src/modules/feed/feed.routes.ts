import { Router } from 'express';
import { feedController } from './feed.controller';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createPostSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5000),
    type: z.enum(['ANNOUNCEMENT', 'EVENT', 'ACHIEVEMENT', 'GENERAL', 'PHOTO', 'VIDEO']).optional(),
    mediaUrls: z.array(z.string().url()).optional(),
    isPinned: z.boolean().optional(),
    targetSegmentIds: z.array(z.string()).optional(),
  }),
});

const updatePostSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5000).optional(),
    type: z.enum(['ANNOUNCEMENT', 'EVENT', 'ACHIEVEMENT', 'GENERAL', 'PHOTO', 'VIDEO']).optional(),
    mediaUrls: z.array(z.string().url()).optional(),
    isPinned: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),
});

const addCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(1000),
  }),
});

// Public routes (any authenticated member)
router.get('/', feedController.getPosts);
router.get('/:id', feedController.getPostById);
router.post('/', validate(createPostSchema), feedController.createPost);
router.patch('/:id', validate(updatePostSchema), feedController.updatePost);
router.delete('/:id', feedController.deletePost);

// Likes
router.post('/:id/like', feedController.likePost);
router.delete('/:id/like', feedController.unlikePost);

// Comments
router.post('/:id/comments', validate(addCommentSchema), feedController.addComment);
router.delete('/comments/:commentId', feedController.deleteComment);

// Admin routes
router.get('/statistics/overview', authorize('ADMIN', 'SUPER_ADMIN'), feedController.getStatistics);

export default router;
