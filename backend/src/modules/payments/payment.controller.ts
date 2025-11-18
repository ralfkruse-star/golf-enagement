import { Request, Response } from 'express';
import { paymentService } from './payment.service';
import { z } from 'zod';
import { logger } from '../../shared/services/logger.service';

// Validation schemas
const createEventCheckoutSchema = z.object({
  eventId: z.string().uuid(),
  amount: z.number().positive(),
});

const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
});

const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional(),
});

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

export class PaymentController {
  /**
   * POST /api/v1/payments/event/checkout
   * Create checkout session for event payment
   */
  async createEventCheckout(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;

      const validation = createEventCheckoutSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const result = await paymentService.createEventCheckout({
        ...validation.data,
        memberId,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error creating event checkout:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/payments/subscriptions
   * Create subscription checkout session
   */
  async createSubscription(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;

      const validation = createSubscriptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const result = await paymentService.createSubscription({
        ...validation.data,
        memberId,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error creating subscription:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('already has')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/v1/payments/subscriptions/:subscriptionId
   * Cancel subscription
   */
  async cancelSubscription(req: Request, res: Response) {
    try {
      const { subscriptionId } = req.params;
      const memberId = (req as any).user.id;

      const validation = cancelSubscriptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const result = await paymentService.cancelSubscription({
        subscriptionId,
        memberId,
        ...validation.data,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error cancelling subscription:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/payments/me
   * Get member's payment history
   */
  async getMyPayments(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;
      const { limit, offset } = req.query;

      const result = await paymentService.getMemberPayments(memberId, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error getting member payments:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/payments/subscriptions/me
   * Get member's subscriptions
   */
  async getMySubscriptions(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;

      const subscriptions = await paymentService.getMemberSubscriptions(memberId);

      res.json(subscriptions);
    } catch (error: any) {
      logger.error('Error getting member subscriptions:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/payments/subscription-plans
   * Get all subscription plans
   */
  async getSubscriptionPlans(req: Request, res: Response) {
    try {
      const plans = await paymentService.getSubscriptionPlans();

      res.json(plans);
    } catch (error: any) {
      logger.error('Error getting subscription plans:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/payments/:paymentId/refund
   * Process refund (admin only)
   */
  async processRefund(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;

      const validation = refundSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const result = await paymentService.processRefund({
        paymentId,
        ...validation.data,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error processing refund:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('only refund')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/webhooks/stripe
   * Stripe webhook handler
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      // Verify webhook signature
      const event = paymentService.verifyWebhookSignature(
        req.body,
        signature
      );

      // Process webhook event
      await paymentService.handleWebhook(event);

      res.json({ received: true });
    } catch (error: any) {
      logger.error('Webhook signature verification failed:', error);
      res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  }
}

export const paymentController = new PaymentController();
