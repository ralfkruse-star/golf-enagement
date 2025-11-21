import { Request, Response, NextFunction } from 'express';
import { aiService } from '../../shared/services/ai.service';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/middleware/error.middleware';

/**
 * AI Recommendations Controller
 * Provides AI-powered personalization and content recommendations
 */

export class AIRecommendationsController {
  /**
   * Get personalized recommendations for current user
   * GET /api/v1/ai/recommendations/me
   */
  async getMyRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.user!.userId;

      // Get member profile with engagement data
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: {
          _count: {
            select: {
              eventRegistrations: { where: { status: 'CONFIRMED' } },
              feedPosts: true,
            },
          },
        },
      });

      if (!member) {
        throw new AppError(404, 'Member not found');
      }

      const recommendations = await aiService.generateRecommendations({
        membershipType: member.membershipType,
        handicap: member.handicap,
        eventCount: member._count.eventRegistrations,
        interests: 'golf', // Could be extended with member preferences
      });

      res.json({
        success: true,
        data: {
          recommendations,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recommendations for specific member (admin)
   * GET /api/v1/ai/recommendations/:memberId
   */
  async getMemberRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { memberId } = req.params;

      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: {
          _count: {
            select: {
              eventRegistrations: { where: { status: 'CONFIRMED' } },
              feedPosts: true,
            },
          },
        },
      });

      if (!member) {
        throw new AppError(404, 'Member not found');
      }

      const recommendations = await aiService.generateRecommendations({
        membershipType: member.membershipType,
        handicap: member.handicap,
        eventCount: member._count.eventRegistrations,
        interests: 'golf',
      });

      res.json({
        success: true,
        data: {
          memberId,
          recommendations,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate AI content for notifications/emails
   * POST /api/v1/ai/content/generate
   */
  async generateContent(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, context } = req.body;

      if (!type || !context) {
        throw new AppError(400, 'Type and context are required');
      }

      if (!['welcome', 'event', 'reminder'].includes(type)) {
        throw new AppError(400, 'Invalid type. Must be: welcome, event, or reminder');
      }

      const content = await aiService.generateNotificationContent(type, context);

      res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Analyze member engagement
   * GET /api/v1/ai/engagement/analyze/:memberId
   */
  async analyzeEngagement(req: Request, res: Response, next: NextFunction) {
    try {
      const { memberId } = req.params;

      // Get member engagement stats
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: {
          _count: {
            select: {
              eventRegistrations: { where: { status: 'CONFIRMED' } },
              feedPosts: true,
            },
          },
        },
      });

      if (!member) {
        throw new AppError(404, 'Member not found');
      }

      // Calculate days since last login
      const lastLoginDays = member.lastLoginAt
        ? Math.floor((Date.now() - new Date(member.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const analysis = await aiService.analyzeEngagement({
        eventCount: member._count.eventRegistrations,
        feedPosts: member._count.feedPosts,
        lastLoginDays,
      });

      res.json({
        success: true,
        data: {
          memberId,
          ...analysis,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get AI-powered event recommendations
   * GET /api/v1/ai/events/recommend
   */
  async recommendEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.user!.userId;

      // Get member profile
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
          membershipType: true,
          handicap: true,
        },
      });

      if (!member) {
        throw new AppError(404, 'Member not found');
      }

      // Get upcoming events
      const events = await prisma.event.findMany({
        where: {
          startDate: { gte: new Date() },
          isPublished: true,
        },
        take: 10,
        orderBy: { startDate: 'asc' },
      });

      // Simple scoring based on membership type and handicap
      const scoredEvents = events.map((event) => {
        let score = 50; // Base score

        // Beginner-friendly events for GUEST/TRIAL
        if (
          (member.membershipType === 'GUEST' || member.membershipType === 'TRIAL') &&
          event.type === 'TRAINING'
        ) {
          score += 30;
        }

        // Tournaments for experienced players
        if (member.handicap && member.handicap < 20 && event.type === 'TOURNAMENT') {
          score += 25;
        }

        // Social events for everyone
        if (event.type === 'SOCIAL') {
          score += 15;
        }

        return {
          event,
          score,
        };
      });

      // Sort by score and return top 5
      const recommendations = scoredEvents
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((item) => item.event);

      res.json({
        success: true,
        data: {
          recommendations,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const aiRecommendationsController = new AIRecommendationsController();
