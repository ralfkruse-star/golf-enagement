import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GamificationService } from './gamification.service';
import { prisma } from '../../database/prisma';

// Mock Prisma
vi.mock('../../database/prisma', () => ({
  prisma: {
    member: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    achievement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    memberAchievement: {
      create: vi.fn(),
    },
  },
}));

// Mock queue service
vi.mock('../../shared/services/queue.service', () => ({
  queuePushNotification: vi.fn(),
}));

// Mock logger
vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('GamificationService', () => {
  let service: GamificationService;

  beforeEach(() => {
    service = new GamificationService();
    vi.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('should return points leaderboard sorted by total points', async () => {
      const mockMembers = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          membershipType: 'FULL',
          membershipStatus: 'ACTIVE',
          achievements: [
            {
              achievement: { points: 100 },
            },
            {
              achievement: { points: 50 },
            },
          ],
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          membershipType: 'FULL',
          membershipStatus: 'ACTIVE',
          achievements: [
            {
              achievement: { points: 200 },
            },
          ],
        },
      ];

      (prisma.member.findMany as any).mockResolvedValue(mockMembers);

      const result = await service.getLeaderboard('points', 10);

      expect(result).toHaveLength(2);
      expect(result[0].totalPoints).toBe(200); // Jane first
      expect(result[1].totalPoints).toBe(150); // John second
      expect(result[0].member.firstName).toBe('Jane');
    });

    it('should return events leaderboard sorted by event count', async () => {
      const mockMembers = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          membershipType: 'FULL',
          membershipStatus: 'ACTIVE',
          _count: {
            eventRegistrations: 5,
          },
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          membershipType: 'FULL',
          membershipStatus: 'ACTIVE',
          _count: {
            eventRegistrations: 10,
          },
        },
      ];

      (prisma.member.findMany as any).mockResolvedValue(mockMembers);

      const result = await service.getLeaderboard('events', 10);

      expect(result).toHaveLength(2);
      expect(result[0].eventCount).toBe(10); // Jane first
      expect(result[1].eventCount).toBe(5); // John second
    });

    it('should return posts leaderboard sorted by post count', async () => {
      const mockMembers = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          membershipType: 'FULL',
          membershipStatus: 'ACTIVE',
          _count: {
            feedPosts: 3,
          },
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          membershipType: 'FULL',
          membershipStatus: 'ACTIVE',
          _count: {
            feedPosts: 7,
          },
        },
      ];

      (prisma.member.findMany as any).mockResolvedValue(mockMembers);

      const result = await service.getLeaderboard('posts', 10);

      expect(result).toHaveLength(2);
      expect(result[0].postCount).toBe(7); // Jane first
      expect(result[1].postCount).toBe(3); // John second
    });

    it('should respect the limit parameter', async () => {
      const mockMembers = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        firstName: `User${i}`,
        lastName: 'Test',
        membershipType: 'FULL',
        membershipStatus: 'ACTIVE',
        achievements: [{ achievement: { points: i * 10 } }],
      }));

      (prisma.member.findMany as any).mockResolvedValue(mockMembers);

      const result = await service.getLeaderboard('points', 5);

      expect(result).toHaveLength(5);
    });
  });

  describe('getMemberStats', () => {
    it('should return complete member statistics', async () => {
      const mockMember = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        achievements: [
          {
            achievement: {
              id: 'ach1',
              name: 'First Event',
              description: 'Attended first event',
              type: 'ATTENDANCE',
              points: 50,
            },
            earnedAt: new Date('2025-01-01'),
          },
          {
            achievement: {
              id: 'ach2',
              name: 'Active Participant',
              description: 'Attended 10 events',
              type: 'PARTICIPATION',
              points: 100,
            },
            earnedAt: new Date('2025-02-01'),
          },
        ],
        _count: {
          eventRegistrations: 12,
          feedPosts: 5,
          feedComments: 8,
          feedLikes: 20,
        },
      };

      (prisma.member.findUnique as any).mockResolvedValue(mockMember);

      const result = await service.getMemberStats('1');

      expect(result.totalPoints).toBe(150);
      expect(result.achievementCount).toBe(2);
      expect(result.eventCount).toBe(12);
      expect(result.postCount).toBe(5);
      expect(result.commentCount).toBe(8);
      expect(result.likeCount).toBe(20);
      expect(result.achievements).toHaveLength(2);
      expect(result.achievements[0].name).toBe('First Event');
    });

    it('should throw error if member not found', async () => {
      (prisma.member.findUnique as any).mockResolvedValue(null);

      await expect(service.getMemberStats('invalid')).rejects.toThrow('Member not found');
    });
  });

  describe('checkAchievements', () => {
    it('should award new achievements when criteria met', async () => {
      const mockMember = {
        id: '1',
        eventRegistrations: [{ status: 'CONFIRMED' }, { status: 'CONFIRMED' }],
        feedPosts: [{ id: '1' }],
        achievements: [],
        joinDate: new Date('2020-01-01'),
      };

      const mockAchievements = [
        {
          id: 'ach1',
          name: 'First Event',
          type: 'ATTENDANCE',
          criteria: { eventCount: 1 },
          isActive: true,
          points: 50,
        },
        {
          id: 'ach2',
          name: 'Active Participant',
          type: 'PARTICIPATION',
          criteria: { minEvents: 2 },
          isActive: true,
          points: 100,
        },
      ];

      (prisma.member.findUnique as any).mockResolvedValue(mockMember);
      (prisma.achievement.findMany as any).mockResolvedValue(mockAchievements);
      (prisma.achievement.findUnique as any).mockImplementation(({ where }) => {
        return mockAchievements.find(a => a.id === where.id);
      });
      (prisma.memberAchievement.create as any).mockResolvedValue({});

      await service.checkAchievements('1');

      // Should award both achievements
      expect(prisma.memberAchievement.create).toHaveBeenCalledTimes(2);
    });

    it('should not award already earned achievements', async () => {
      const mockMember = {
        id: '1',
        eventRegistrations: [{ status: 'CONFIRMED' }],
        feedPosts: [],
        achievements: [{ achievementId: 'ach1' }],
        joinDate: new Date('2020-01-01'),
      };

      const mockAchievements = [
        {
          id: 'ach1',
          name: 'First Event',
          type: 'ATTENDANCE',
          criteria: { eventCount: 1 },
          isActive: true,
          points: 50,
        },
      ];

      (prisma.member.findUnique as any).mockResolvedValue(mockMember);
      (prisma.achievement.findMany as any).mockResolvedValue(mockAchievements);

      await service.checkAchievements('1');

      // Should not award already earned achievement
      expect(prisma.memberAchievement.create).not.toHaveBeenCalled();
    });

    it('should evaluate ATTENDANCE achievement correctly', async () => {
      const mockMember = {
        id: '1',
        eventRegistrations: [{ status: 'CONFIRMED' }, { status: 'CONFIRMED' }, { status: 'CONFIRMED' }],
        feedPosts: [],
        achievements: [],
        joinDate: new Date('2020-01-01'),
      };

      const mockAchievements = [
        {
          id: 'ach1',
          name: 'Event Enthusiast',
          type: 'ATTENDANCE',
          criteria: { eventCount: 3 },
          isActive: true,
          points: 150,
        },
      ];

      (prisma.member.findUnique as any).mockResolvedValue(mockMember);
      (prisma.achievement.findMany as any).mockResolvedValue(mockAchievements);
      (prisma.achievement.findUnique as any).mockResolvedValue(mockAchievements[0]);
      (prisma.memberAchievement.create as any).mockResolvedValue({});

      await service.checkAchievements('1');

      expect(prisma.memberAchievement.create).toHaveBeenCalledTimes(1);
    });

    it('should evaluate SOCIAL achievement correctly', async () => {
      const mockMember = {
        id: '1',
        eventRegistrations: [],
        feedPosts: [{ id: '1' }, { id: '2' }, { id: '3' }],
        achievements: [],
        joinDate: new Date('2020-01-01'),
      };

      const mockAchievements = [
        {
          id: 'ach1',
          name: 'Social Butterfly',
          type: 'SOCIAL',
          criteria: { postCount: 3 },
          isActive: true,
          points: 100,
        },
      ];

      (prisma.member.findUnique as any).mockResolvedValue(mockMember);
      (prisma.achievement.findMany as any).mockResolvedValue(mockAchievements);
      (prisma.achievement.findUnique as any).mockResolvedValue(mockAchievements[0]);
      (prisma.memberAchievement.create as any).mockResolvedValue({});

      await service.checkAchievements('1');

      expect(prisma.memberAchievement.create).toHaveBeenCalledTimes(1);
    });

    it('should evaluate MILESTONE achievement correctly', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setDate(oneYearAgo.getDate() - 1); // Just over 1 year

      const mockMember = {
        id: '1',
        eventRegistrations: [],
        feedPosts: [],
        achievements: [],
        joinDate: oneYearAgo,
      };

      const mockAchievements = [
        {
          id: 'ach1',
          name: 'One Year Member',
          type: 'MILESTONE',
          criteria: { days: 365 },
          isActive: true,
          points: 200,
        },
      ];

      (prisma.member.findUnique as any).mockResolvedValue(mockMember);
      (prisma.achievement.findMany as any).mockResolvedValue(mockAchievements);
      (prisma.achievement.findUnique as any).mockResolvedValue(mockAchievements[0]);
      (prisma.memberAchievement.create as any).mockResolvedValue({});

      await service.checkAchievements('1');

      expect(prisma.memberAchievement.create).toHaveBeenCalledTimes(1);
    });
  });
});
