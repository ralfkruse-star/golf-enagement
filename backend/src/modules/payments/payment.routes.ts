import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requireRole } from '../../shared/middleware/role.middleware';
import express from 'express';

const router = Router();

// Webhook endpoint (must be BEFORE express.json middleware)
// This will be registered separately in the main app
export const webhookRouter = Router();
webhookRouter.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook.bind(paymentController)
);

// Public routes
router.get('/subscription-plans', paymentController.getSubscriptionPlans.bind(paymentController));

// Member routes
router.post('/event/checkout', authenticate, paymentController.createEventCheckout.bind(paymentController));
router.post('/subscriptions', authenticate, paymentController.createSubscription.bind(paymentController));
router.delete('/subscriptions/:subscriptionId', authenticate, paymentController.cancelSubscription.bind(paymentController));
router.get('/me', authenticate, paymentController.getMyPayments.bind(paymentController));
router.get('/subscriptions/me', authenticate, paymentController.getMySubscriptions.bind(paymentController));

// Admin routes
router.post(
  '/:paymentId/refund',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  paymentController.processRefund.bind(paymentController)
);

export default router;
