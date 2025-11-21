import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock environment
process.env.OPENAI_API_KEY = 'test-api-key';

// Mock logger
vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for member profile', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content:
                '1. Schnupperkurs für Einsteiger\n2. Golf-Grundlagen Training\n3. Social Golf Event',
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockOpenAIResponse,
      });

      const { aiService } = await import('./ai.service');

      const result = await aiService.generateRecommendations({
        membershipType: 'GUEST',
        handicap: null,
        eventCount: 0,
        interests: 'golf',
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toContain('Schnupperkurs');
    });

    it('should return empty array if API key not set', async () => {
      delete process.env.OPENAI_API_KEY;

      // Re-import to get new instance
      vi.resetModules();
      const { aiService } = await import('./ai.service');

      const result = await aiService.generateRecommendations({
        membershipType: 'FULL',
        handicap: 18,
        eventCount: 5,
        interests: 'golf',
      });

      expect(result).toEqual([]);

      // Restore for other tests
      process.env.OPENAI_API_KEY = 'test-api-key';
    });
  });

  describe('generateNotificationContent', () => {
    it('should generate welcome notification content', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: 'Herzlich willkommen im Golfclub Siek! Wir freuen uns auf Sie.',
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockOpenAIResponse,
      });

      const { aiService } = await import('./ai.service');

      const result = await aiService.generateNotificationContent('welcome', {
        membershipType: 'GUEST',
      });

      expect(result.title).toBe('Willkommen!');
      expect(result.body).toContain('willkommen');
    });

    it('should generate event notification content', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: 'Großes Turnier am Wochenende! Jetzt anmelden.',
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockOpenAIResponse,
      });

      const { aiService } = await import('./ai.service');

      const result = await aiService.generateNotificationContent('event', {
        eventTitle: 'Sommer Turnier',
        date: '2025-07-15',
      });

      expect(result.title).toBe('Sommer Turnier');
      expect(result.body).toContain('Turnier');
    });

    it('should use fallback content on API error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('API Error'));

      const { aiService } = await import('./ai.service');

      const result = await aiService.generateNotificationContent('welcome', {
        membershipType: 'FULL',
      });

      expect(result.title).toBe('Willkommen im Golfclub Siek!');
      expect(result.body).toContain('freuen uns');
    });
  });

  describe('analyzeEngagement', () => {
    it('should identify low engagement members', async () => {
      const { aiService } = await import('./ai.service');

      const result = await aiService.analyzeEngagement({
        eventCount: 0,
        feedPosts: 0,
        lastLoginDays: 35,
      });

      expect(result.engagementLevel).toBe('low');
      expect(result.suggestions).toContain('Sende persönliche Einladung zu Einsteiger-Events');
    });

    it('should identify medium engagement members', async () => {
      const { aiService } = await import('./ai.service');

      const result = await aiService.analyzeEngagement({
        eventCount: 2,
        feedPosts: 1,
        lastLoginDays: 15,
      });

      expect(result.engagementLevel).toBe('medium');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should identify high engagement members', async () => {
      const { aiService } = await import('./ai.service');

      const result = await aiService.analyzeEngagement({
        eventCount: 10,
        feedPosts: 5,
        lastLoginDays: 2,
      });

      expect(result.engagementLevel).toBe('high');
      expect(result.suggestions).toContain('Belohne aktive Teilnahme mit Achievement');
    });
  });
});
