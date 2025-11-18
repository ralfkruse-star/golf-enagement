import Queue from 'bull';
import { redis } from '../../database/redis';
import { fcmService } from './fcm.service';
import { brevoService, emailTemplates } from './brevo.service';
import { prisma } from '../../database/prisma';
import { logger } from '../../config/logger';
import { NotificationPriority, NotificationStatus, NotificationType } from '@prisma/client';

/**
 * Notification Queue Service using Bull
 * Handles asynchronous notification delivery (Push, Email, SMS)
 */

interface NotificationJob {
  notificationId: string;
  type: NotificationType;
  priority: NotificationPriority;
}

interface PushNotificationJob extends NotificationJob {
  title: string;
  body: string;
  recipientIds: string[];
  data?: Record<string, string>;
  imageUrl?: string;
}

interface EmailNotificationJob extends NotificationJob {
  subject: string;
  htmlContent: string;
  recipientEmails: string[];
}

// Create notification queue
export const notificationQueue = new Queue<NotificationJob>('notifications', {
  redis: {
    host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'localhost',
    port: parseInt(process.env.REDIS_URL?.split(':')[2] || '6379'),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * Process push notifications
 */
notificationQueue.process('push', async (job) => {
  const { notificationId, title, body, recipientIds, data, imageUrl } = job.data as PushNotificationJob;

  try {
    logger.info(`Processing push notification ${notificationId} for ${recipientIds.length} recipients`);

    // Update status to SENDING
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'SENDING' },
    });

    // Get push tokens for all recipients
    const tokens = await fcmService.getMembersTokens(recipientIds);

    if (tokens.length === 0) {
      logger.warn(`No push tokens found for notification ${notificationId}`);
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          totalRecipients: 0,
          successCount: 0,
          failureCount: 0,
        },
      });
      return;
    }

    // Send in batches
    const result = await fcmService.sendBatch(tokens, {
      title,
      body,
      data,
      imageUrl,
      priority: 'high',
    });

    // Update notification status
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalRecipients: tokens.length,
        successCount: result.totalSuccess,
        failureCount: result.totalFailure,
      },
    });

    logger.info(`Push notification ${notificationId} sent: ${result.totalSuccess} success, ${result.totalFailure} failed`);
  } catch (error) {
    logger.error(`Failed to process push notification ${notificationId}:`, error);

    // Update notification status to FAILED
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
});

/**
 * Process email notifications
 */
notificationQueue.process('email', async (job) => {
  const { notificationId, subject, htmlContent, recipientEmails } = job.data as EmailNotificationJob;

  try {
    logger.info(`Processing email notification ${notificationId} for ${recipientEmails.length} recipients`);

    // Update status to SENDING
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'SENDING' },
    });

    // Send email via Brevo
    // In production, you'd use Brevo's campaign API for bulk sends
    // For now, we'll send individual emails
    let successCount = 0;
    let failureCount = 0;

    for (const email of recipientEmails) {
      try {
        await brevoService.sendTransactionalEmail({
          to: [{ email }],
          subject,
          htmlContent,
          tags: ['notification', notificationId],
        });
        successCount++;
      } catch (error) {
        failureCount++;
        logger.error(`Failed to send email to ${email}:`, error);
      }
    }

    // Update notification status
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalRecipients: recipientEmails.length,
        successCount,
        failureCount,
      },
    });

    logger.info(`Email notification ${notificationId} sent: ${successCount} success, ${failureCount} failed`);
  } catch (error) {
    logger.error(`Failed to process email notification ${notificationId}:`, error);

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
});

/**
 * Queue event handlers
 */
notificationQueue.on('completed', (job) => {
  logger.debug(`Job ${job.id} completed`);
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

notificationQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

/**
 * Helper function to queue a push notification
 */
export async function queuePushNotification(
  notificationId: string,
  title: string,
  body: string,
  recipientIds: string[],
  options?: {
    data?: Record<string, string>;
    imageUrl?: string;
    priority?: NotificationPriority;
    delay?: number;
  }
) {
  await notificationQueue.add(
    'push',
    {
      notificationId,
      type: 'PUSH',
      title,
      body,
      recipientIds,
      data: options?.data,
      imageUrl: options?.imageUrl,
      priority: options?.priority || 'NORMAL',
    },
    {
      priority: options?.priority === 'URGENT' ? 1 : options?.priority === 'HIGH' ? 2 : 3,
      delay: options?.delay,
    }
  );

  logger.info(`Queued push notification ${notificationId} for ${recipientIds.length} recipients`);
}

/**
 * Helper function to queue an email notification
 */
export async function queueEmailNotification(
  notificationId: string,
  subject: string,
  htmlContent: string,
  recipientEmails: string[],
  options?: {
    priority?: NotificationPriority;
    delay?: number;
  }
) {
  await notificationQueue.add(
    'email',
    {
      notificationId,
      type: 'EMAIL',
      subject,
      htmlContent,
      recipientEmails,
      priority: options?.priority || 'NORMAL',
    },
    {
      priority: options?.priority === 'URGENT' ? 1 : options?.priority === 'HIGH' ? 2 : 3,
      delay: options?.delay,
    }
  );

  logger.info(`Queued email notification ${notificationId} for ${recipientEmails.length} recipients`);
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    notificationQueue.getWaitingCount(),
    notificationQueue.getActiveCount(),
    notificationQueue.getCompletedCount(),
    notificationQueue.getFailedCount(),
    notificationQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}
