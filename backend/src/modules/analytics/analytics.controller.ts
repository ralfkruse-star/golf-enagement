import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { AppError } from '../../shared/middleware/error.middleware';

/**
 * Analytics Controller
 * Handles analytics and reporting endpoints
 */

export class AnalyticsController {
  /**
   * Get dashboard overview
   * GET /api/v1/analytics/dashboard
   */
  async getDashboardOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const [members, events, engagement, revenue] = await Promise.all([
        analyticsService.getMemberAnalytics(),
        analyticsService.getEventAnalytics(),
        analyticsService.getEngagementAnalytics(),
        analyticsService.getRevenueAnalytics(),
      ]);

      res.json({
        success: true,
        data: {
          members,
          events,
          engagement,
          revenue,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get member analytics
   * GET /api/v1/analytics/members
   */
  async getMemberAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getMemberAnalytics();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event analytics
   * GET /api/v1/analytics/events
   */
  async getEventAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getEventAnalytics();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get engagement analytics
   * GET /api/v1/analytics/engagement
   */
  async getEngagementAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getEngagementAnalytics();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get revenue analytics
   * GET /api/v1/analytics/revenue
   */
  async getRevenueAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getRevenueAnalytics();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get time-series data
   * GET /api/v1/analytics/time-series?metric=members&days=30
   */
  async getTimeSeriesData(req: Request, res: Response, next: NextFunction) {
    try {
      const metric = req.query.metric as 'members' | 'events' | 'posts';
      const days = parseInt(req.query.days as string) || 30;

      if (!['members', 'events', 'posts'].includes(metric)) {
        throw new AppError(400, 'Invalid metric. Must be: members, events, or posts');
      }

      if (days < 1 || days > 365) {
        throw new AppError(400, 'Days must be between 1 and 365');
      }

      const data = await analyticsService.getTimeSeriesData(metric, days);

      res.json({
        success: true,
        data: {
          metric,
          days,
          timeSeries: data,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top performers
   * GET /api/v1/analytics/top-performers?limit=10
   */
  async getTopPerformers(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      if (limit < 1 || limit > 100) {
        throw new AppError(400, 'Limit must be between 1 and 100');
      }

      const data = await analyticsService.getTopPerformers(limit);

      res.json({
        success: true,
        data: {
          topPerformers: data,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
