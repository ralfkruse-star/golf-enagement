import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventsService } from './events.service';
import { prisma } from '../../database/prisma';

// Mock dependencies
vi.mock('../../database/prisma', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    eventRegistration: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock('../../shared/services/websocket.service', () => ({
  websocketService: {
    broadcastGlobal: vi.fn(),
    sendToUsers: vi.fn(),
  },
  WebSocketEvents: {
    EVENT_CREATED: 'event:created',
    EVENT_REGISTRATION: 'event:registration',
  },
}));

vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventsService();
  });

  describe('createEvent', () => {
    it('should successfully create an event', async () => {
      const eventInput = {
        title: 'Golf Tournament',
        description: 'Annual tournament',
        type: 'TOURNAMENT' as const,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-01'),
        maxParticipants: 20,
        registrationDeadline: new Date('2025-05-25'),
      };

      const mockEvent = {
        id: '1',
        ...eventInput,
        isPublished: false,
        currentParticipants: 0,
        createdAt: new Date(),
      };

      (prisma.event.create as any).mockResolvedValue(mockEvent);

      const result = await service.createEvent(eventInput, 'admin123');

      expect(result).toEqual(mockEvent);
      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Golf Tournament',
            type: 'TOURNAMENT',
            maxParticipants: 20,
          }),
        })
      );
    });
  });

  describe('registerForEvent', () => {
    it('should successfully register member for event', async () => {
      const mockEvent = {
        id: '1',
        title: 'Golf Tournament',
        maxParticipants: 20,
        registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        requiresApproval: false,
      };

      const mockRegistration = {
        id: 'reg1',
        eventId: '1',
        memberId: 'member1',
        status: 'CONFIRMED',
      };

      (prisma.event.findUnique as any).mockResolvedValue(mockEvent);
      (prisma.eventRegistration.findFirst as any).mockResolvedValue(null);
      (prisma.eventRegistration.count as any).mockResolvedValue(10);
      (prisma.eventRegistration.create as any).mockResolvedValue(mockRegistration);

      const result = await service.registerForEvent('1', 'member1');

      expect(result.status).toBe('CONFIRMED');
      expect(prisma.eventRegistration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: '1',
            memberId: 'member1',
            status: 'CONFIRMED',
          }),
        })
      );
    });

    it('should put member on waitlist if event is full', async () => {
      const mockEvent = {
        id: '1',
        title: 'Golf Tournament',
        maxParticipants: 20,
        registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        requiresApproval: false,
      };

      const mockRegistration = {
        id: 'reg1',
        eventId: '1',
        memberId: 'member1',
        status: 'WAITLIST',
      };

      (prisma.event.findUnique as any).mockResolvedValue(mockEvent);
      (prisma.eventRegistration.findFirst as any).mockResolvedValue(null);
      (prisma.eventRegistration.count as any).mockResolvedValue(20); // Event is full
      (prisma.eventRegistration.create as any).mockResolvedValue(mockRegistration);

      const result = await service.registerForEvent('1', 'member1');

      expect(result.status).toBe('WAITLIST');
    });

    it('should throw error if already registered', async () => {
      const mockEvent = {
        id: '1',
        title: 'Golf Tournament',
        maxParticipants: 20,
        registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      (prisma.event.findUnique as any).mockResolvedValue(mockEvent);
      (prisma.eventRegistration.findFirst as any).mockResolvedValue({
        id: 'reg1',
        status: 'CONFIRMED',
      });

      await expect(service.registerForEvent('1', 'member1')).rejects.toThrow(
        'Already registered'
      );
    });

    it('should throw error if registration deadline passed', async () => {
      const mockEvent = {
        id: '1',
        title: 'Golf Tournament',
        maxParticipants: 20,
        registrationDeadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      };

      (prisma.event.findUnique as any).mockResolvedValue(mockEvent);
      (prisma.eventRegistration.findFirst as any).mockResolvedValue(null);

      await expect(service.registerForEvent('1', 'member1')).rejects.toThrow(
        'Registration deadline has passed'
      );
    });
  });

  describe('cancelRegistration', () => {
    it('should successfully cancel registration', async () => {
      const mockEvent = {
        id: '1',
        title: 'Golf Tournament',
        registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const mockRegistration = {
        id: 'reg1',
        eventId: '1',
        memberId: 'member1',
        status: 'CONFIRMED',
      };

      (prisma.eventRegistration.findUnique as any).mockResolvedValue(mockRegistration);
      (prisma.event.findUnique as any).mockResolvedValue(mockEvent);
      (prisma.eventRegistration.delete as any).mockResolvedValue(mockRegistration);
      (prisma.eventRegistration.findMany as any).mockResolvedValue([]);

      await service.cancelRegistration('reg1', 'member1');

      expect(prisma.eventRegistration.delete).toHaveBeenCalledWith({
        where: { id: 'reg1' },
      });
    });

    it('should throw error if not authorized', async () => {
      const mockRegistration = {
        id: 'reg1',
        eventId: '1',
        memberId: 'member1',
        status: 'CONFIRMED',
      };

      (prisma.eventRegistration.findUnique as any).mockResolvedValue(mockRegistration);

      await expect(service.cancelRegistration('reg1', 'member2')).rejects.toThrow(
        'Not authorized'
      );
    });
  });
});
