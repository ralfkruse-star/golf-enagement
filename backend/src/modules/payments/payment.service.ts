import { PrismaClient, PaymentType, PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { env } from '../../config/env';
import { logger } from '../../shared/services/logger.service';

const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export class PaymentService {
  /**
   * Create checkout session for event payment
   */
  async createEventCheckout(params: {
    eventId: string;
    memberId: string;
    amount: number;
  }) {
    const { eventId, memberId, amount } = params;

    // Get member and event
    const [member, event] = await Promise.all([
      prisma.member.findUnique({ where: { id: memberId } }),
      prisma.event.findUnique({ where: { id: eventId } }),
    ]);

    if (!member) throw new Error('Member not found');
    if (!event) throw new Error('Event not found');

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        memberId,
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'EUR',
        type: PaymentType.EVENT_FEE,
        status: PaymentStatus.PENDING,
        eventId,
        description: `Event Registration: ${event.title}`,
      },
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'sepa_debit'],
      mode: 'payment',
      customer_email: member.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: event.title,
              description: event.description || undefined,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/events/${eventId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/events/${eventId}`,
      metadata: {
        paymentId: payment.id,
        eventId,
        memberId,
        type: 'EVENT_FEE',
      },
    });

    // Update payment with session ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeCheckoutSessionId: session.id,
        status: PaymentStatus.PROCESSING,
      },
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentId: payment.id,
    };
  }

  /**
   * Create subscription for membership
   */
  async createSubscription(params: {
    memberId: string;
    planId: string;
  }) {
    const { memberId, planId } = params;

    // Get member and plan
    const [member, plan] = await Promise.all([
      prisma.member.findUnique({ where: { id: memberId } }),
      prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
    ]);

    if (!member) throw new Error('Member not found');
    if (!plan) throw new Error('Subscription plan not found');
    if (!plan.isActive) throw new Error('Subscription plan is inactive');

    // Check if member already has active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        memberId,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      throw new Error('Member already has an active subscription');
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId: string;
    const existingCustomer = await stripe.customers.list({
      email: member.email,
      limit: 1,
    });

    if (existingCustomer.data.length > 0) {
      stripeCustomerId = existingCustomer.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: member.email,
        name: `${member.firstName} ${member.lastName}`,
        metadata: {
          memberId: member.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'sepa_debit'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/subscription`,
      metadata: {
        memberId,
        planId,
      },
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(params: {
    subscriptionId: string;
    memberId: string;
    cancelAtPeriodEnd?: boolean;
  }) {
    const { subscriptionId, memberId, cancelAtPeriodEnd = true } = params;

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) throw new Error('Subscription not found');
    if (subscription.memberId !== memberId) throw new Error('Unauthorized');

    // Cancel in Stripe
    if (cancelAtPeriodEnd) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          cancelAtPeriodEnd: true,
        },
      });
    } else {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
    }

    return { success: true };
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        member: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return payment;
  }

  /**
   * Get member's payment history
   */
  async getMemberPayments(memberId: string, params?: {
    limit?: number;
    offset?: number;
  }) {
    const { limit = 50, offset = 0 } = params || {};

    const payments = await prisma.payment.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.payment.count({
      where: { memberId },
    });

    return { payments, total };
  }

  /**
   * Get member's subscriptions
   */
  async getMemberSubscriptions(memberId: string) {
    const subscriptions = await prisma.subscription.findMany({
      where: { memberId },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions;
  }

  /**
   * Process refund (admin only)
   */
  async processRefund(params: {
    paymentId: string;
    amount?: number;
    reason?: string;
  }) {
    const { paymentId, amount, reason } = params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new Error('Payment not found');
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new Error('Can only refund succeeded payments');
    }
    if (!payment.stripePaymentIntentId) {
      throw new Error('No Stripe payment intent found');
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
      reason: reason as any,
    });

    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
      },
    });

    logger.info(`Refund processed: ${refund.id} for payment ${paymentId}`);

    return { success: true, refundId: refund.id };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event) {
    logger.info(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        logger.warn(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const { paymentId, eventId, memberId } = session.metadata || {};

    if (session.mode === 'payment' && paymentId) {
      // One-time payment (event, etc.)
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
        },
      });

      // If event payment, confirm registration
      if (eventId && memberId) {
        await prisma.eventRegistration.updateMany({
          where: {
            eventId,
            memberId,
          },
          data: {
            status: 'CONFIRMED',
          },
        });
      }

      logger.info(`Payment completed: ${paymentId}`);
    } else if (session.mode === 'subscription') {
      // Subscription - will be handled by subscription.created event
      logger.info(`Subscription checkout completed: ${session.subscription}`);
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
        },
      });

      logger.info(`Payment succeeded: ${payment.id}`);
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      logger.error(`Payment failed: ${payment.id}`);
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      logger.error('Customer deleted');
      return;
    }

    const memberId = customer.metadata?.memberId;
    const planId = subscription.metadata?.planId;

    if (!memberId || !planId) {
      logger.error('Missing metadata in subscription');
      return;
    }

    // Create subscription record
    await prisma.subscription.create({
      data: {
        memberId,
        planId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        status: 'ACTIVE',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    logger.info(`Subscription created: ${subscription.id}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: subscription.status === 'active' ? 'ACTIVE' : subscription.status === 'past_due' ? 'PAST_DUE' : 'CANCELLED',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    logger.info(`Subscription updated: ${subscription.id}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    logger.info(`Subscription deleted: ${subscription.id}`);
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    logger.info(`Invoice payment succeeded: ${invoice.id}`);
    // Additional handling if needed
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    logger.error(`Invoice payment failed: ${invoice.id}`);

    // Mark subscription as past_due
    if (invoice.subscription) {
      const dbSubscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: invoice.subscription as string },
      });

      if (dbSubscription) {
        await prisma.subscription.update({
          where: { id: dbSubscription.id },
          data: { status: 'PAST_DUE' },
        });
      }
    }
  }

  /**
   * Get all subscription plans
   */
  async getSubscriptionPlans() {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { amount: 'asc' },
    });

    return plans;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET || ''
    );
  }
}

export const paymentService = new PaymentService();
