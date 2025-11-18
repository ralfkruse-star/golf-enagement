import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { notificationsService } from './notifications.service';
import { fcmService } from '../../shared/services/fcm.service';
import { AppError } from '../../shared/middleware/error.middleware';

export class NotificationsController {
  async createNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notification = await notificationsService.createNotification(
        req.body,
        req.user!.userId
      );
      res.status(201).json(notification);
    } catch (error) {
      next(error);
    }
  }

  async sendNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await notificationsService.sendNotification(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as any,
        type: req.query.type as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await notificationsService.getNotifications(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getNotificationById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const notification = await notificationsService.getNotificationById(id);
      res.json(notification);
    } catch (error) {
      next(error);
    }
  }

  async getMyNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const notifications = await notificationsService.getMemberNotifications(
        req.user!.userId,
        limit,
        offset
      );
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  }

  async cancelNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await notificationsService.cancelNotification(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await notificationsService.getStatistics();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  // Push token management
  async registerPushToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token, platform } = req.body;

      if (!token || !platform) {
        throw new AppError(400, 'Token and platform are required');
      }

      await fcmService.registerToken(req.user!.userId, token, platform);
      res.json({ message: 'Push token registered successfully' });
    } catch (error) {
      next(error);
    }
  }

  async unregisterPushToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      if (!token) {
        throw new AppError(400, 'Token is required');
      }

      await fcmService.unregisterToken(token);
      res.json({ message: 'Push token unregistered successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();
