import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { queuePushNotification, queueEmailNotification } from '../../shared/services/queue.service';
import { NotificationPriority, NotificationStatus, NotificationType } from '@prisma/client';
import { logger } from '../../config/logger';

interface CreateNotificationInput {
  title: string;
  body: string;
  type: NotificationType;
  priority?: NotificationPriority;
  recipientSegmentIds?: string[];
  recipientIds?: string[];
  data?: any;
  imageUrl?: string;
  scheduledAt?: Date;
  expiresAt?: Date;
}

export class NotificationsService {
  /**
   * Create and send/schedule a notification
   */
  async createNotification(input: CreateNotificationInput, createdById: string) {
    // Validate recipients
    if ((!input.recipientSegmentIds || input.recipientSegmentIds.length === 0) &&
        (!input.recipientIds || input.recipientIds.length === 0)) {
      throw new AppError(400, 'At least one recipient segment or recipient ID must be specified');
    }

    // Determine recipient IDs from segments
    let allRecipientIds: string[] = input.recipientIds || [];

    if (input.recipientSegmentIds && input.recipientSegmentIds.length > 0) {
      const segmentMembers = await prisma.memberSegmentAssignment.findMany({
        where: {
          segmentId: { in: input.recipientSegmentIds },
        },
        select: { memberId: true },
      });

      const segmentRecipientIds = segmentMembers.map(m => m.memberId);
      allRecipientIds = [...new Set([...allRecipientIds, ...segmentRecipientIds])];
    }

    if (allRecipientIds.length === 0) {
      throw new AppError(400, 'No recipients found for specified segments/IDs');
    }

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        title: input.title,
        body: input.body,
        type: input.type,
        priority: input.priority || 'NORMAL',
        recipientSegmentIds: input.recipientSegmentIds || [],
        recipientIds: allRecipientIds,
        data: input.data,
        imageUrl: input.imageUrl,
        scheduledAt: input.scheduledAt,
        expiresAt: input.expiresAt,
        status: input.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        totalRecipients: allRecipientIds.length,
        createdById,
      },
    });

    // If not scheduled, send immediately
    if (!input.scheduledAt) {
      await this.sendNotification(notification.id);
    }

    logger.info(`Notification created: ${notification.id} (${allRecipientIds.length} recipients)`);

    return notification;
  }

  /**
   * Send a notification (queue for processing)
   */
  async sendNotification(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    if (notification.status === 'SENT' || notification.status === 'SENDING') {
      throw new AppError(400, 'Notification already sent or sending');
    }

    // Get recipient details
    const recipients = await prisma.member.findMany({
      where: {
        id: { in: notification.recipientIds },
        membershipStatus: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (recipients.length === 0) {
      throw new AppError(400, 'No active recipients found');
    }

    // Queue based on notification type
    if (notification.type === 'PUSH' || notification.type === 'IN_APP') {
      await queuePushNotification(
        notification.id,
        notification.title,
        notification.body,
        recipients.map(r => r.id),
        {
          data: notification.data as Record<string, string>,
          imageUrl: notification.imageUrl || undefined,
          priority: notification.priority,
        }
      );
    }

    if (notification.type === 'EMAIL') {
      await queueEmailNotification(
        notification.id,
        notification.title,
        notification.body,
        recipients.map(r => r.email),
        {
          priority: notification.priority,
        }
      );
    }

    logger.info(`Notification ${notificationId} queued for delivery`);

    return { message: 'Notification queued for delivery', recipientCount: recipients.length };
  }

  /**
   * Get all notifications (admin)
   */
  async getNotifications(filters?: {
    status?: NotificationStatus;
    type?: NotificationType;
    limit?: number;
    offset?: number;
  }) {
    const { status, type, limit = 50, offset = 0 } = filters || {};

    const where: any = {};

    if (status) where.status = status;
    if (type) where.type = type;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          body: true,
          type: true,
          priority: true,
          status: true,
          scheduledAt: true,
          sentAt: true,
          totalRecipients: true,
          successCount: true,
          failureCount: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    return notification;
  }

  /**
   * Get notification history for a member
   */
  async getMemberNotifications(memberId: string, limit = 50, offset = 0) {
    // Find all notifications where this member is a recipient
    const notifications = await prisma.notification.findMany({
      where: {
        recipientIds: { has: memberId },
        status: 'SENT',
      },
      orderBy: { sentAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        imageUrl: true,
        data: true,
        sentAt: true,
        createdAt: true,
      },
    });

    return notifications;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    if (notification.status !== 'SCHEDULED' && notification.status !== 'DRAFT') {
      throw new AppError(400, 'Can only cancel scheduled or draft notifications');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'CANCELLED' },
    });

    logger.info(`Notification ${notificationId} cancelled`);

    return { message: 'Notification cancelled' };
  }

  /**
   * Get notification statistics
   */
  async getStatistics() {
    const [total, sent, scheduled, failed] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { status: 'SENT' } }),
      prisma.notification.count({ where: { status: 'SCHEDULED' } }),
      prisma.notification.count({ where: { status: 'FAILED' } }),
    ]);

    // Get recent notifications
    const recentNotifications = await prisma.notification.findMany({
      where: { status: 'SENT' },
      orderBy: { sentAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        totalRecipients: true,
        successCount: true,
        failureCount: true,
        sentAt: true,
      },
    });

    // Calculate total reach
    const totalReach = await prisma.notification.aggregate({
      where: { status: 'SENT' },
      _sum: { successCount: true },
    });

    return {
      total,
      sent,
      scheduled,
      failed,
      totalReach: totalReach._sum.successCount || 0,
      recentNotifications,
    };
  }
}

export const notificationsService = new NotificationsService();
