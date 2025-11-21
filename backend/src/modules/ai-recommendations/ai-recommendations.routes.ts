import { Router } from 'express';
import { aiRecommendationsController } from './ai-recommendations.controller';
import { authenticate, requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();

/**
 * AI Recommendations Routes
 * Base path: /api/v1/ai
 */

// Member routes (authenticated)
router.get(
  '/recommendations/me',
  authenticate,
  aiRecommendationsController.getMyRecommendations.bind(aiRecommendationsController)
);

router.get(
  '/events/recommend',
  authenticate,
  aiRecommendationsController.recommendEvents.bind(aiRecommendationsController)
);

// Admin routes
router.get(
  '/recommendations/:memberId',
  authenticate,
  requireRole('ADMIN'),
  aiRecommendationsController.getMemberRecommendations.bind(aiRecommendationsController)
);

router.post(
  '/content/generate',
  authenticate,
  requireRole('ADMIN'),
  aiRecommendationsController.generateContent.bind(aiRecommendationsController)
);

router.get(
  '/engagement/analyze/:memberId',
  authenticate,
  requireRole('ADMIN'),
  aiRecommendationsController.analyzeEngagement.bind(aiRecommendationsController)
);

export default router;
