import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from './analytics.service';
import { prisma } from '../../database/prisma';
import { cacheService } from '../../database/redis';

// Mock dependencies
vi.mock('../../database/prisma', () => ({
  prisma: {
    member: {
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    event: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    eventRegistration: {
      count: vi.fn(),
    },
    feedPost: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    feedComment: {
      count: vi.fn(),
    },
    feedLike: {
      count: vi.fn(),
    },
    notification: {
      count: vi.fn(),
    },
    teeTimeBooking: {
      count: vi.fn(),
    },
    payment: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

vi.mock('../../database/redis', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnalyticsService();
    (cacheService.get as any).mockResolvedValue(null); // No cache by default
  });

  describe('getMemberAnalytics', () => {
    it('should return complete member analytics', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      (prisma.member.count as any)
        .mockResolvedValueOnce(1000) // Total members
        .mockResolvedValueOnce(950) // Active members
        .mockResolvedValueOnce(25); // New members last 30 days

      (prisma.member.groupBy as any)
        .mockResolvedValueOnce([
          { membershipType: 'FULL', _count: 700 },
          { membershipType: 'JUNIOR', _count: 200 },
          { membershipType: 'SENIOR', _count: 100 },
        ])
        .mockResolvedValueOnce([
          { membershipStatus: 'ACTIVE', _count: 950 },
          { membershipStatus: 'INACTIVE', _count: 50 },
        ]);

      (prisma.member.aggregate as any).mockResolvedValue({
        _avg: { handicap: 18.5 },
      });

      const result = await service.getMemberAnalytics();

      expect(result.totalMembers).toBe(1000);
      expect(result.activeMembers).toBe(950);
      expect(result.inactiveMembers).toBe(50);
      expect(result.newMembersLast30Days).toBe(25);
      expect(result.averageHandicap).toBe(18.5);
      expect(result.membersByType).toHaveLength(3);
      expect(result.membersByStatus).toHaveLength(2);
    });

    it('should return cached data if available', async () => {
      const cachedData = { totalMembers: 100, activeMembers: 90 };
      (cacheService.get as any).mockResolvedValue(cachedData);

      const result = await service.getMemberAnalytics();

      expect(result).toEqual(cachedData);
      expect(prisma.member.count).not.toHaveBeenCalled();
    });

    it('should cache the result after fetching', async () => {
      (prisma.member.count as any).mockResolvedValue(100);
      (prisma.member.groupBy as any).mockResolvedValue([]);
      (prisma.member.aggregate as any).mockResolvedValue({ _avg: { handicap: null } });

      await service.getMemberAnalytics();

      expect(cacheService.set).toHaveBeenCalledWith(
        'analytics:members:overview',
        expect.any(Object),
        300
      );
    });
  });

  describe('getEventAnalytics', () => {
    it('should return complete event analytics', async () => {
      (prisma.event.count as any)
        .mockResolvedValueOnce(150) // Total events
        .mockResolvedValueOnce(25) // Upcoming events
        .mockResolvedValueOnce(100); // Past events

      (prisma.event.groupBy as any).mockResolvedValue([
        { type: 'TOURNAMENT', _count: 50 },
        { type: 'TRAINING', _count: 70 },
        { type: 'SOCIAL', _count: 30 },
      ]);

      (prisma.eventRegistration.count as any).mockResolvedValue(500);

      // Mock calculateAverageAttendance
      (prisma.event.findMany as any).mockResolvedValue([
        { maxParticipants: 20, _count: { registrations: 18 } },
        { maxParticipants: 30, _count: { registrations: 25 } },
      ]);

      const result = await service.getEventAnalytics();

      expect(result.totalEvents).toBe(150);
      expect(result.upcomingEvents).toBe(25);
      expect(result.pastEvents).toBe(100);
      expect(result.totalRegistrations).toBe(500);
      expect(result.eventsByType).toHaveLength(3);
    });
  });

  describe('getEngagementAnalytics', () => {
    it('should return complete engagement analytics', async () => {
      (prisma.feedPost.count as any).mockResolvedValue(200);
      (prisma.feedComment.count as any).mockResolvedValue(500);
      (prisma.feedLike.count as any).mockResolvedValue(1000);
      (prisma.notification.count as any).mockResolvedValue(5000);
      (prisma.teeTimeBooking.count as any).mockResolvedValue(300);

      // Mock active members
      (prisma.member.findMany as any).mockResolvedValue(
        Array.from({ length: 75 }, (_, i) => ({ id: String(i) }))
      );

      const result = await service.getEngagementAnalytics();

      expect(result.totalPosts).toBe(200);
      expect(result.totalComments).toBe(500);
      expect(result.totalLikes).toBe(1000);
      expect(result.totalNotificationsSent).toBe(5000);
      expect(result.totalTeeTimeBookings).toBe(300);
      expect(result.activeMembersLast7Days).toBe(75);
      expect(result.engagementScore).toBeGreaterThan(0);
      expect(result.engagementScore).toBeLessThanOrEqual(100);
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return complete revenue analytics', async () => {
      (prisma.payment.aggregate as any)
        .mockResolvedValueOnce({
          _sum: { amount: 50000 },
        })
        .mockResolvedValueOnce({
          _sum: { amount: 30000 },
          _count: 150,
        })
        .mockResolvedValueOnce({
          _sum: { amount: 20000 },
          _count: 80,
        });

      (prisma.payment.groupBy as any).mockResolvedValue([
        { status: 'COMPLETED', _count: 200, _sum: { amount: 45000 } },
        { status: 'PENDING', _count: 10, _sum: { amount: 3000 } },
        { status: 'FAILED', _count: 5, _sum: { amount: 2000 } },
      ]);

      const result = await service.getRevenueAnalytics();

      expect(result.totalRevenue).toBe(50000);
      expect(result.subscriptionRevenue.amount).toBe(30000);
      expect(result.eventRevenue.amount).toBe(20000);
      expect(result.revenueByStatus).toHaveLength(3);
    });

    it('should handle null revenue values', async () => {
      (prisma.payment.aggregate as any).mockResolvedValue({
        _sum: { amount: null },
        _count: 0,
      });

      (prisma.payment.groupBy as any).mockResolvedValue([]);

      const result = await service.getRevenueAnalytics();

      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('getTimeSeriesData', () => {
    it('should return time series data for members', async () => {
      const mockMembers = [
        { createdAt: new Date('2025-01-15') },
        { createdAt: new Date('2025-01-15') },
        { createdAt: new Date('2025-01-20') },
      ];

      (prisma.member.findMany as any).mockResolvedValue(mockMembers);

      const result = await service.getTimeSeriesData('members', 30);

      expect(result).toHaveLength(30); // All 30 days
      expect(result.every((item) => 'date' in item && 'count' in item)).toBe(true);
    });

    it('should return time series data for events', async () => {
      const mockEvents = [
        { createdAt: new Date() },
        { createdAt: new Date() },
      ];

      (prisma.event.findMany as any).mockResolvedValue(mockEvents);

      const result = await service.getTimeSeriesData('events', 7);

      expect(result).toHaveLength(7);
    });

    it('should return time series data for posts', async () => {
      const mockPosts = [
        { createdAt: new Date() },
      ];

      (prisma.feedPost.findMany as any).mockResolvedValue(mockPosts);

      const result = await service.getTimeSeriesData('posts', 14);

      expect(result).toHaveLength(14);
    });
  });

  describe('getTopPerformers', () => {
    it('should return top performers sorted by engagement score', async () => {
      const mockMembers = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          membershipType: 'FULL',
          _count: {
            feedPosts: 10,
            feedComments: 20,
            feedLikes: 30,
            eventRegistrations: 5,
          },
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          membershipType: 'FULL',
          _count: {
            feedPosts: 5,
            feedComments: 10,
            feedLikes: 15,
            eventRegistrations: 10,
          },
        },
      ];

      (prisma.member.findMany as any).mockResolvedValue(mockMembers);

      const result = await service.getTopPerformers(10);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('stats');
      // John should score higher: 10*5 + 20*2 + 30*1 + 5*10 = 50+40+30+50 = 170
      // Jane scores: 5*5 + 10*2 + 15*1 + 10*10 = 25+20+15+100 = 160
      expect(result[0].id).toBe('1'); // John has higher score
    });

    it('should respect the limit parameter', async () => {
      const mockMembers = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        firstName: `User${i}`,
        lastName: 'Test',
        membershipType: 'FULL',
        _count: {
          feedPosts: i,
          feedComments: i * 2,
          feedLikes: i * 3,
          eventRegistrations: i,
        },
      }));

      (prisma.member.findMany as any).mockResolvedValue(mockMembers);

      const result = await service.getTopPerformers(5);

      expect(result).toHaveLength(5);
    });
  });
});
