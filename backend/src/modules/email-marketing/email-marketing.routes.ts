import { Router } from 'express';
import { emailMarketingController } from './email-marketing.controller';
import { authenticate, requireRole } from '../../shared/middleware/auth.middleware';

const router = Router();

/**
 * Email Marketing Routes
 * Base path: /api/v1/email-marketing
 * All routes require ADMIN role
 */

// Campaign management
router.post(
  '/campaigns',
  authenticate,
  requireRole('ADMIN'),
  emailMarketingController.createCampaign.bind(emailMarketingController)
);

router.post(
  '/campaigns/:id/send',
  authenticate,
  requireRole('ADMIN'),
  emailMarketingController.sendCampaign.bind(emailMarketingController)
);

router.post(
  '/campaigns/:id/test',
  authenticate,
  requireRole('ADMIN'),
  emailMarketingController.sendTestCampaign.bind(emailMarketingController)
);

router.get(
  '/campaigns/:id/stats',
  authenticate,
  requireRole('ADMIN'),
  emailMarketingController.getCampaignStats.bind(emailMarketingController)
);

// Broadcast emails
router.post(
  '/broadcast',
  authenticate,
  requireRole('ADMIN'),
  emailMarketingController.sendBroadcastEmail.bind(emailMarketingController)
);

// Contact lists
router.get(
  '/lists',
  authenticate,
  requireRole('ADMIN'),
  emailMarketingController.getContactLists.bind(emailMarketingController)
);

// Sync
router.post(
  '/sync',
  authenticate,
  requireRole('ADMIN'),
  emailMarketingController.syncMembers.bind(emailMarketingController)
);

// Templates
router.get(
  '/templates',
  authenticate,
  requireRole('ADMIN'),
  emailMarketingController.getTemplates.bind(emailMarketingController)
);

export default router;
