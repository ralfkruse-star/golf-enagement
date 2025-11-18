import { logger } from '../../config/logger';
import { prisma } from '../../database/prisma';
import admin from 'firebase-admin';

/**
 * Firebase Cloud Messaging (FCM) Service
 * Handles push notifications to iOS and Android devices
 */

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
  badge?: number;
  priority?: 'high' | 'normal';
}

interface PushTarget {
  tokens?: string[];
  topic?: string;
  condition?: string;
}

class FCMService {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initialize() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.isInitialized = true;
        logger.info('✅ Firebase already initialized');
        return;
      }

      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

      if (!serviceAccount) {
        logger.warn('⚠️  FIREBASE_SERVICE_ACCOUNT not configured - Push notifications disabled');
        return;
      }

      // Initialize with service account
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
        projectId: process.env.FCM_PROJECT_ID,
      });

      this.isInitialized = true;
      logger.info('✅ Firebase Admin SDK initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Firebase:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Send push notification to specific device tokens
   */
  async sendToTokens(tokens: string[], message: PushMessage): Promise<{
    successCount: number;
    failureCount: number;
    failedTokens: string[];
  }> {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, failedTokens: [] };
    }

    try {
      const fcmMessage: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data,
        android: {
          priority: message.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: message.sound || 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: message.sound || 'default',
              badge: message.badge,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(fcmMessage);

      // Collect failed tokens
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          logger.warn(`Failed to send to token ${tokens[idx]}: ${resp.error?.message}`);
        }
      });

      // Clean up invalid tokens from database
      if (failedTokens.length > 0) {
        await this.cleanupInvalidTokens(failedTokens);
      }

      logger.info(`Push sent: ${response.successCount} success, ${response.failureCount} failed`);

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens,
      };
    } catch (error) {
      logger.error('Failed to send push notifications:', error);
      throw error;
    }
  }

  /**
   * Send push notification to a topic (e.g., "all-members")
   */
  async sendToTopic(topic: string, message: PushMessage): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      const fcmMessage: admin.messaging.Message = {
        topic,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.imageUrl,
        },
        data: message.data,
        android: {
          priority: message.priority === 'high' ? 'high' : 'normal',
        },
      };

      const messageId = await admin.messaging().send(fcmMessage);
      logger.info(`Push sent to topic "${topic}": ${messageId}`);
      return messageId;
    } catch (error) {
      logger.error(`Failed to send push to topic "${topic}":`, error);
      throw error;
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info(`Subscribed ${response.successCount} tokens to topic "${topic}"`);

      if (response.failureCount > 0) {
        logger.warn(`Failed to subscribe ${response.failureCount} tokens to topic "${topic}"`);
      }
    } catch (error) {
      logger.error(`Failed to subscribe to topic "${topic}":`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      logger.info(`Unsubscribed ${response.successCount} tokens from topic "${topic}"`);
    } catch (error) {
      logger.error(`Failed to unsubscribe from topic "${topic}":`, error);
      throw error;
    }
  }

  /**
   * Send push notification in batches (max 500 tokens per batch)
   */
  async sendBatch(tokens: string[], message: PushMessage): Promise<{
    totalSuccess: number;
    totalFailure: number;
    failedTokens: string[];
  }> {
    const BATCH_SIZE = 500;
    const batches: string[][] = [];

    // Split tokens into batches
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      batches.push(tokens.slice(i, i + BATCH_SIZE));
    }

    let totalSuccess = 0;
    let totalFailure = 0;
    const allFailedTokens: string[] = [];

    // Send each batch
    for (const batch of batches) {
      const result = await this.sendToTokens(batch, message);
      totalSuccess += result.successCount;
      totalFailure += result.failureCount;
      allFailedTokens.push(...result.failedTokens);
    }

    logger.info(`Batch send complete: ${totalSuccess} success, ${totalFailure} failed (${batches.length} batches)`);

    return {
      totalSuccess,
      totalFailure,
      failedTokens: allFailedTokens,
    };
  }

  /**
   * Clean up invalid/expired tokens from database
   */
  private async cleanupInvalidTokens(tokens: string[]): Promise<void> {
    try {
      await prisma.pushToken.deleteMany({
        where: {
          token: {
            in: tokens,
          },
        },
      });
      logger.info(`Cleaned up ${tokens.length} invalid push tokens`);
    } catch (error) {
      logger.error('Failed to cleanup invalid tokens:', error);
    }
  }

  /**
   * Register a new push token for a member
   */
  async registerToken(memberId: string, token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
    try {
      // Upsert token (update if exists, create if not)
      await prisma.pushToken.upsert({
        where: { token },
        update: {
          memberId,
          platform,
          isActive: true,
          lastUsed: new Date(),
        },
        create: {
          token,
          memberId,
          platform,
          isActive: true,
        },
      });

      logger.info(`Registered push token for member ${memberId} (${platform})`);
    } catch (error) {
      logger.error('Failed to register push token:', error);
      throw error;
    }
  }

  /**
   * Unregister a push token
   */
  async unregisterToken(token: string): Promise<void> {
    try {
      await prisma.pushToken.update({
        where: { token },
        data: { isActive: false },
      });
      logger.info(`Unregistered push token: ${token}`);
    } catch (error) {
      logger.error('Failed to unregister push token:', error);
      throw error;
    }
  }

  /**
   * Get all active tokens for a member
   */
  async getMemberTokens(memberId: string): Promise<string[]> {
    const tokens = await prisma.pushToken.findMany({
      where: {
        memberId,
        isActive: true,
      },
      select: { token: true },
    });

    return tokens.map(t => t.token);
  }

  /**
   * Get all active tokens for multiple members
   */
  async getMembersTokens(memberIds: string[]): Promise<string[]> {
    const tokens = await prisma.pushToken.findMany({
      where: {
        memberId: { in: memberIds },
        isActive: true,
      },
      select: { token: true },
    });

    return tokens.map(t => t.token);
  }
}

export const fcmService = new FCMService();
