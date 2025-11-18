import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { AchievementType } from '@prisma/client';
import { logger } from '../../config/logger';
import { queuePushNotification } from '../../shared/services/queue.service';

/**
 * Gamification Service
 * Handles achievements, leaderboards, and member engagement
 */

export class GamificationService {
  /**
   * Check and award achievements for a member
   */
  async checkAchievements(memberId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        eventRegistrations: { where: { status: 'CONFIRMED' } },
        feedPosts: true,
        achievements: true,
      },
    });

    if (!member) return;

    const allAchievements = await prisma.achievement.findMany({
      where: { isActive: true },
    });

    const earnedAchievementIds = member.achievements.map((a) => a.achievementId);

    for (const achievement of allAchievements) {
      if (earnedAchievementIds.includes(achievement.id)) continue;

      const earned = this.evaluateAchievement(achievement, member);

      if (earned) {
        await this.awardAchievement(memberId, achievement.id);
      }
    }
  }

  /**
   * Evaluate if achievement criteria is met
   */
  private evaluateAchievement(achievement: any, member: any): boolean {
    const criteria = achievement.criteria as any;

    switch (achievement.type) {
      case 'ATTENDANCE':
        return member.eventRegistrations.length >= (criteria.eventCount || 0);

      case 'PARTICIPATION':
        return member.eventRegistrations.length >= (criteria.minEvents || 0);

      case 'SOCIAL':
        return member.feedPosts.length >= (criteria.postCount || 0);

      case 'MILESTONE':
        // Custom milestone logic
        const daysSinceMembership =
          (Date.now() - new Date(member.joinDate).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceMembership >= (criteria.days || 0);

      default:
        return false;
    }
  }

  /**
   * Award achievement to member
   */
  private async awardAchievement(memberId: string, achievementId: string) {
    try {
      await prisma.memberAchievement.create({
        data: { memberId, achievementId },
      });

      const achievement = await prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) return;

      // Send push notification
      await queuePushNotification(
        `achievement-${achievementId}-${memberId}`,
        '🏆 Neues Achievement!',
        `Du hast "${achievement.name}" erreicht! +${achievement.points} Punkte`,
        [memberId],
        {
          data: {
            achievementId,
            type: 'achievement_earned',
          },
          priority: 'HIGH',
        }
      );

      logger.info(`Achievement ${achievementId} awarded to member ${memberId}`);
    } catch (error) {
      logger.error('Failed to award achievement:', error);
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(type: 'points' | 'events' | 'posts' = 'points', limit = 10) {
    if (type === 'points') {
      const members = await prisma.member.findMany({
        where: { membershipStatus: 'ACTIVE' },
        include: {
          achievements: {
            include: { achievement: true },
          },
        },
        take: limit * 2, // Get more to calculate points
      });

      const leaderboard = members
        .map((member) => ({
          member: {
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            membershipType: member.membershipType,
          },
          totalPoints: member.achievements.reduce(
            (sum, a) => sum + (a.achievement.points || 0),
            0
          ),
          achievementCount: member.achievements.length,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, limit);

      return leaderboard;
    }

    if (type === 'events') {
      const members = await prisma.member.findMany({
        where: { membershipStatus: 'ACTIVE' },
        include: {
          _count: {
            select: {
              eventRegistrations: {
                where: { status: 'CONFIRMED' },
              },
            },
          },
        },
        orderBy: {
          eventRegistrations: { _count: 'desc' },
        },
        take: limit,
      });

      return members.map((m) => ({
        member: {
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          membershipType: m.membershipType,
        },
        eventCount: m._count.eventRegistrations,
      }));
    }

    if (type === 'posts') {
      const members = await prisma.member.findMany({
        where: { membershipStatus: 'ACTIVE' },
        include: {
          _count: {
            select: { feedPosts: { where: { deletedAt: null } } },
          },
        },
        orderBy: {
          feedPosts: { _count: 'desc' },
        },
        take: limit,
      });

      return members.map((m) => ({
        member: {
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          membershipType: m.membershipType,
        },
        postCount: m._count.feedPosts,
      }));
    }

    return [];
  }

  /**
   * Get member stats
   */
  async getMemberStats(memberId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        achievements: {
          include: { achievement: true },
        },
        _count: {
          select: {
            eventRegistrations: { where: { status: 'CONFIRMED' } },
            feedPosts: { where: { deletedAt: null } },
            feedComments: { where: { deletedAt: null } },
            feedLikes: true,
          },
        },
      },
    });

    if (!member) {
      throw new AppError(404, 'Member not found');
    }

    const totalPoints = member.achievements.reduce(
      (sum, a) => sum + (a.achievement.points || 0),
      0
    );

    return {
      totalPoints,
      achievementCount: member.achievements.length,
      eventCount: member._count.eventRegistrations,
      postCount: member._count.feedPosts,
      commentCount: member._count.feedComments,
      likeCount: member._count.feedLikes,
      achievements: member.achievements.map((a) => ({
        id: a.achievement.id,
        name: a.achievement.name,
        description: a.achievement.description,
        type: a.achievement.type,
        points: a.achievement.points,
        earnedAt: a.earnedAt,
      })),
    };
  }
}

export const gamificationService = new GamificationService();
