import { Request, Response, NextFunction } from 'express';
import { gamificationService } from './gamification.service';
import { AppError } from '../../shared/middleware/error.middleware';

/**
 * Gamification Controller
 * Handles achievements, leaderboards, and member engagement
 */

export class GamificationController {
  /**
   * Get leaderboard
   * GET /api/v1/gamification/leaderboard?type=points&limit=10
   */
  async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.query.type as 'points' | 'events' | 'posts') || 'points';
      const limit = parseInt(req.query.limit as string) || 10;

      if (!['points', 'events', 'posts'].includes(type)) {
        throw new AppError(400, 'Invalid leaderboard type. Must be: points, events, or posts');
      }

      if (limit < 1 || limit > 100) {
        throw new AppError(400, 'Limit must be between 1 and 100');
      }

      const leaderboard = await gamificationService.getLeaderboard(type, limit);

      res.json({
        success: true,
        data: {
          type,
          leaderboard,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get member stats
   * GET /api/v1/gamification/stats/me
   */
  async getMyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.user!.userId;

      const stats = await gamificationService.getMemberStats(memberId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific member stats (admin)
   * GET /api/v1/gamification/stats/:memberId
   */
  async getMemberStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { memberId } = req.params;

      const stats = await gamificationService.getMemberStats(memberId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually trigger achievement check (admin)
   * POST /api/v1/gamification/achievements/check/:memberId
   */
  async checkAchievements(req: Request, res: Response, next: NextFunction) {
    try {
      const { memberId } = req.params;

      await gamificationService.checkAchievements(memberId);

      res.json({
        success: true,
        message: 'Achievement check completed',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check all members' achievements (super admin)
   * POST /api/v1/gamification/achievements/check-all
   */
  async checkAllAchievements(req: Request, res: Response, next: NextFunction) {
    try {
      // Get all active members
      const { prisma } = await import('../../database/prisma');
      const members = await prisma.member.findMany({
        where: { membershipStatus: 'ACTIVE' },
        select: { id: true },
      });

      // Check achievements for each member (in background)
      const promises = members.map(m => gamificationService.checkAchievements(m.id));
      await Promise.all(promises);

      res.json({
        success: true,
        message: `Achievement check completed for ${members.length} members`,
        data: {
          memberCount: members.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const gamificationController = new GamificationController();
