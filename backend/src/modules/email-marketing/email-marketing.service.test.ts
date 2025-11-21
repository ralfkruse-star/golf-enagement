import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailMarketingService } from './email-marketing.service';
import { brevoService } from '../../shared/services/brevo.service';
import { prisma } from '../../database/prisma';

// Mock dependencies
vi.mock('../../shared/services/brevo.service', () => ({
  brevoService: {
    createCampaign: vi.fn(),
    sendCampaign: vi.fn(),
    sendCampaignTest: vi.fn(),
    getCampaignStats: vi.fn(),
    sendTransactionalEmail: vi.fn(),
    syncContactsBulk: vi.fn(),
  },
}));

vi.mock('../../database/prisma', () => ({
  prisma: {
    member: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('EmailMarketingService', () => {
  let service: EmailMarketingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailMarketingService();
  });

  describe('createCampaign', () => {
    it('should create a campaign successfully', async () => {
      const mockCampaign = { id: 123 };
      (brevoService.createCampaign as any).mockResolvedValue(mockCampaign);

      const input = {
        name: 'Test Campaign',
        subject: 'Test Subject',
        htmlContent: '<p>Test Content</p>',
        recipientType: 'all' as const,
      };

      const result = await service.createCampaign(input, 'admin123');

      expect(result.id).toBe(123);
      expect(result.name).toBe('Test Campaign');
      expect(brevoService.createCampaign).toHaveBeenCalled();
    });

    it('should handle scheduled campaigns', async () => {
      const mockCampaign = { id: 124 };
      (brevoService.createCampaign as any).mockResolvedValue(mockCampaign);

      const scheduledDate = '2025-12-25T10:00:00Z';
      const input = {
        name: 'Christmas Campaign',
        subject: 'Merry Christmas',
        htmlContent: '<p>Happy Holidays!</p>',
        recipientType: 'all' as const,
        scheduledAt: scheduledDate,
      };

      const result = await service.createCampaign(input, 'admin123');

      expect(result.status).toBe('scheduled');
      expect(result.scheduledAt).toBe(scheduledDate);
    });
  });

  describe('sendCampaign', () => {
    it('should send campaign successfully', async () => {
      (brevoService.sendCampaign as any).mockResolvedValue({});

      await service.sendCampaign(123);

      expect(brevoService.sendCampaign).toHaveBeenCalledWith(123);
    });
  });

  describe('sendTestCampaign', () => {
    it('should send test campaign to specified emails', async () => {
      (brevoService.sendCampaignTest as any).mockResolvedValue({});

      const testEmails = ['test1@example.com', 'test2@example.com'];
      await service.sendTestCampaign(123, testEmails);

      expect(brevoService.sendCampaignTest).toHaveBeenCalledWith(123, testEmails);
    });
  });

  describe('getCampaignStats', () => {
    it('should return campaign statistics', async () => {
      const mockStats = {
        statistics: {
          sent: 1000,
          delivered: 950,
          uniqueOpens: 500,
          uniqueClicks: 100,
          unsubscriptions: 5,
          hardBounces: 10,
          softBounces: 5,
        },
        status: 'sent',
      };

      (brevoService.getCampaignStats as any).mockResolvedValue(mockStats);

      const result = await service.getCampaignStats(123);

      expect(result.sent).toBe(1000);
      expect(result.delivered).toBe(950);
      expect(result.opens).toBe(500);
      expect(result.clicks).toBe(100);
      expect(result.bounces).toBe(15);
    });
  });

  describe('sendBroadcastEmail', () => {
    it('should send email to specified members', async () => {
      const mockMembers = [
        { email: 'member1@example.com', firstName: 'John', lastName: 'Doe' },
        { email: 'member2@example.com', firstName: 'Jane', lastName: 'Smith' },
      ];

      (prisma.member.findMany as any).mockResolvedValue(mockMembers);
      (brevoService.sendTransactionalEmail as any).mockResolvedValue({});

      const input = {
        subject: 'Important Update',
        htmlContent: '<p>Important message</p>',
        recipientIds: ['1', '2'],
      };

      const result = await service.sendBroadcastEmail(input);

      expect(result.recipientCount).toBe(2);
      expect(brevoService.sendTransactionalEmail).toHaveBeenCalledTimes(2);
    });

    it('should throw error if no active members found', async () => {
      (prisma.member.findMany as any).mockResolvedValue([]);

      const input = {
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        recipientIds: ['invalid'],
      };

      await expect(service.sendBroadcastEmail(input)).rejects.toThrow(
        'No active members found'
      );
    });
  });

  describe('syncMembersToBrevo', () => {
    it('should sync all active members to Brevo', async () => {
      const mockMembers = [
        {
          email: 'member1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          membershipType: 'FULL',
          membershipStatus: 'ACTIVE',
          handicap: 18,
        },
        {
          email: 'guest@example.com',
          firstName: 'Guest',
          lastName: 'User',
          membershipType: 'GUEST',
          membershipStatus: 'ACTIVE',
          handicap: null,
        },
      ];

      (prisma.member.findMany as any).mockResolvedValue(mockMembers);
      (brevoService.syncContactsBulk as any).mockResolvedValue({});

      const result = await service.syncMembersToBrevo();

      expect(result.syncedCount).toBe(2);
      expect(brevoService.syncContactsBulk).toHaveBeenCalled();
    });
  });

  describe('getEmailTemplates', () => {
    it('should return available email templates', () => {
      const templates = service.getEmailTemplates();

      expect(templates).toHaveLength(4);
      expect(templates[0].id).toBe('welcome');
      expect(templates[1].id).toBe('event_confirmation');
    });
  });

  describe('getContactLists', () => {
    it('should return Brevo contact lists', async () => {
      const lists = await service.getContactLists();

      expect(lists).toHaveLength(2);
      expect(lists[0].name).toBe('Active Members');
      expect(lists[1].name).toBe('Trial Members');
    });
  });
});
