import { prisma } from '../../database/prisma';
import { cacheService } from '../../database/redis';
import { logger } from '../../config/logger';

/**
 * Analytics Service
 * Provides comprehensive statistics and reports for the golf club
 */

export class AnalyticsService {
  /**
   * Get member analytics overview
   */
  async getMemberAnalytics() {
    const cacheKey = 'analytics:members:overview';
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const [
      totalMembers,
      activeMembers,
      membersByType,
      membersByStatus,
      newMembersLast30Days,
      averageHandicap,
    ] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { membershipStatus: 'ACTIVE' } }),
      prisma.member.groupBy({
        by: ['membershipType'],
        _count: true,
      }),
      prisma.member.groupBy({
        by: ['membershipStatus'],
        _count: true,
      }),
      prisma.member.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.member.aggregate({
        _avg: { handicap: true },
        where: {
          handicap: { not: null },
          membershipStatus: 'ACTIVE',
        },
      }),
    ]);

    const result = {
      totalMembers,
      activeMembers,
      inactiveMembers: totalMembers - activeMembers,
      membersByType: membersByType.map((item) => ({
        type: item.membershipType,
        count: item._count,
      })),
      membersByStatus: membersByStatus.map((item) => ({
        status: item.membershipStatus,
        count: item._count,
      })),
      newMembersLast30Days,
      averageHandicap: averageHandicap._avg.handicap
        ? Math.round(averageHandicap._avg.handicap * 10) / 10
        : null,
    };

    await cacheService.set(cacheKey, result, 300); // Cache for 5 minutes
    return result;
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics() {
    const cacheKey = 'analytics:events:overview';
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const [
      totalEvents,
      upcomingEvents,
      pastEvents,
      eventsByType,
      totalRegistrations,
      averageAttendanceRate,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { startDate: { gte: now }, isPublished: true } }),
      prisma.event.count({ where: { endDate: { lt: now } } }),
      prisma.event.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.eventRegistration.count({ where: { status: 'CONFIRMED' } }),
      this.calculateAverageAttendance(),
    ]);

    const result = {
      totalEvents,
      upcomingEvents,
      pastEvents,
      eventsByType: eventsByType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
      totalRegistrations,
      averageAttendanceRate,
    };

    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Get engagement analytics
   */
  async getEngagementAnalytics() {
    const cacheKey = 'analytics:engagement:overview';
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const [
      totalPosts,
      totalComments,
      totalLikes,
      totalNotificationsSent,
      totalTeeTimeBookings,
      activeMembersLast7Days,
    ] = await Promise.all([
      prisma.feedPost.count({ where: { deletedAt: null } }),
      prisma.feedComment.count({ where: { deletedAt: null } }),
      prisma.feedLike.count(),
      prisma.notification.count({ where: { sentAt: { not: null } } }),
      prisma.teeTimeBooking.count(),
      this.getActiveMembersCount(7),
    ]);

    const result = {
      totalPosts,
      totalComments,
      totalLikes,
      totalNotificationsSent,
      totalTeeTimeBookings,
      activeMembersLast7Days,
      engagementScore: this.calculateEngagementScore({
        totalPosts,
        totalComments,
        totalLikes,
        activeMembersLast7Days,
      }),
    };

    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Get revenue analytics (payments)
   */
  async getRevenueAnalytics() {
    const cacheKey = 'analytics:revenue:overview';
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const [totalRevenue, revenueByStatus, subscriptionRevenue, eventRevenue] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      prisma.payment.groupBy({
        by: ['status'],
        _count: true,
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { type: 'SUBSCRIPTION', status: 'COMPLETED' },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { type: 'EVENT', status: 'COMPLETED' },
      }),
    ]);

    const result = {
      totalRevenue: totalRevenue._sum.amount || 0,
      revenueByStatus: revenueByStatus.map((item) => ({
        status: item.status,
        count: item._count,
        amount: item._sum.amount || 0,
      })),
      subscriptionRevenue: {
        amount: subscriptionRevenue._sum.amount || 0,
        count: subscriptionRevenue._count,
      },
      eventRevenue: {
        amount: eventRevenue._sum.amount || 0,
        count: eventRevenue._count,
      },
    };

    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Get time-series data for dashboard charts
   */
  async getTimeSeriesData(metric: 'members' | 'events' | 'posts', days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (metric === 'members') {
      const members = await prisma.member.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      return this.groupByDay(members, 'createdAt', days);
    }

    if (metric === 'events') {
      const events = await prisma.event.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      return this.groupByDay(events, 'createdAt', days);
    }

    if (metric === 'posts') {
      const posts = await prisma.feedPost.findMany({
        where: {
          createdAt: { gte: startDate },
          deletedAt: null,
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      return this.groupByDay(posts, 'createdAt', days);
    }

    return [];
  }

  /**
   * Get top performers (members with most engagement)
   */
  async getTopPerformers(limit = 10) {
    const members = await prisma.member.findMany({
      where: { membershipStatus: 'ACTIVE' },
      include: {
        _count: {
          select: {
            feedPosts: { where: { deletedAt: null } },
            feedComments: { where: { deletedAt: null } },
            feedLikes: true,
            eventRegistrations: { where: { status: 'CONFIRMED' } },
          },
        },
      },
      take: limit * 2, // Get more to calculate scores
    });

    const performers = members
      .map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        membershipType: member.membershipType,
        score:
          member._count.feedPosts * 5 +
          member._count.feedComments * 2 +
          member._count.feedLikes * 1 +
          member._count.eventRegistrations * 10,
        stats: {
          posts: member._count.feedPosts,
          comments: member._count.feedComments,
          likes: member._count.feedLikes,
          events: member._count.eventRegistrations,
        },
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return performers;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async calculateAverageAttendance(): Promise<number> {
    const events = await prisma.event.findMany({
      where: {
        endDate: { lt: new Date() },
        maxParticipants: { gt: 0 },
      },
      include: {
        _count: {
          select: {
            registrations: { where: { status: 'CONFIRMED' } },
          },
        },
      },
    });

    if (events.length === 0) return 0;

    const totalRate = events.reduce((sum, event) => {
      const rate = (event._count.registrations / event.maxParticipants) * 100;
      return sum + rate;
    }, 0);

    return Math.round(totalRate / events.length);
  }

  private async getActiveMembersCount(days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Members who logged in, posted, commented, or registered for events
    const activeMembers = await prisma.member.findMany({
      where: {
        OR: [
          { lastLoginAt: { gte: since } },
          { feedPosts: { some: { createdAt: { gte: since } } } },
          { feedComments: { some: { createdAt: { gte: since } } } },
          { eventRegistrations: { some: { createdAt: { gte: since } } } },
        ],
      },
      select: { id: true },
    });

    return activeMembers.length;
  }

  private calculateEngagementScore(data: {
    totalPosts: number;
    totalComments: number;
    totalLikes: number;
    activeMembersLast7Days: number;
  }): number {
    // Simple engagement score formula (0-100)
    const postScore = Math.min((data.totalPosts / 100) * 20, 20);
    const commentScore = Math.min((data.totalComments / 200) * 20, 20);
    const likeScore = Math.min((data.totalLikes / 500) * 20, 20);
    const activeScore = Math.min((data.activeMembersLast7Days / 50) * 40, 40);

    return Math.round(postScore + commentScore + likeScore + activeScore);
  }

  private groupByDay(items: any[], dateField: string, days: number) {
    const grouped: { [key: string]: number } = {};

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const key = date.toISOString().split('T')[0];
      grouped[key] = 0;
    }

    // Count items per day
    items.forEach((item) => {
      const date = new Date(item[dateField]);
      const key = date.toISOString().split('T')[0];
      if (grouped[key] !== undefined) {
        grouped[key]++;
      }
    });

    return Object.entries(grouped).map(([date, count]) => ({
      date,
      count,
    }));
  }
}

export const analyticsService = new AnalyticsService();
