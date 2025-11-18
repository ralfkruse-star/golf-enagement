import { TeeTimeService } from './teetime.service';
import { PrismaClient, TeeTimeStatus, BookingStatus } from '@prisma/client';
import { addDays, format } from 'date-fns';

// Mock Prisma Client
jest.mock('@prisma/client');

describe('TeeTimeService', () => {
  let teeTimeService: TeeTimeService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    teeTimeService = new TeeTimeService();
    (teeTimeService as any).prisma = mockPrisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSlots', () => {
    it('should generate time slots successfully', async () => {
      const mockConfig = {
        id: 'config-1',
        startTime: '08:00',
        endTime: '18:00',
        interval: 10,
        isActive: true,
      };

      mockPrisma.teeTimeConfiguration.findFirst = jest.fn().mockResolvedValue(mockConfig);
      mockPrisma.teeTimeSlot.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.teeTimeSlot.createMany = jest.fn().mockResolvedValue({ count: 60 });

      const startDate = new Date('2025-11-20');
      const endDate = new Date('2025-11-20');

      const result = await teeTimeService.generateSlots({
        startDate,
        endDate,
        course: 'main',
      });

      expect(result.created).toBeGreaterThan(0);
      expect(mockPrisma.teeTimeConfiguration.findFirst).toHaveBeenCalled();
      expect(mockPrisma.teeTimeSlot.createMany).toHaveBeenCalled();
    });

    it('should throw error if no active configuration', async () => {
      mockPrisma.teeTimeConfiguration.findFirst = jest.fn().mockResolvedValue(null);

      const startDate = new Date('2025-11-20');
      const endDate = new Date('2025-11-20');

      await expect(
        teeTimeService.generateSlots({
          startDate,
          endDate,
        })
      ).rejects.toThrow('No active tee-time configuration found');
    });

    it('should not duplicate existing slots', async () => {
      const mockConfig = {
        id: 'config-1',
        startTime: '08:00',
        endTime: '18:00',
        interval: 10,
        isActive: true,
      };

      const existingSlot = {
        id: 'slot-1',
        date: new Date('2025-11-20'),
        time: '08:00',
        course: 'main',
      };

      mockPrisma.teeTimeConfiguration.findFirst = jest.fn().mockResolvedValue(mockConfig);
      mockPrisma.teeTimeSlot.findUnique = jest.fn().mockResolvedValue(existingSlot);
      mockPrisma.teeTimeSlot.createMany = jest.fn().mockResolvedValue({ count: 0 });

      const startDate = new Date('2025-11-20');
      const endDate = new Date('2025-11-20');

      const result = await teeTimeService.generateSlots({
        startDate,
        endDate,
        course: 'main',
      });

      // Should skip duplicates
      expect(mockPrisma.teeTimeSlot.createMany).toHaveBeenCalledWith({
        data: [],
        skipDuplicates: true,
      });
    });
  });

  describe('bookSlot', () => {
    it('should book an available slot successfully', async () => {
      const mockSlot = {
        id: 'slot-1',
        date: new Date('2025-11-20'),
        time: '08:00',
        course: 'main',
        maxPlayers: 4,
        currentPlayers: 0,
        status: TeeTimeStatus.AVAILABLE,
        isBlocked: false,
      };

      const mockMember = {
        id: 'member-1',
        membershipType: 'FULL',
      };

      const mockBooking = {
        id: 'booking-1',
        slotId: 'slot-1',
        memberId: 'member-1',
        playerCount: 2,
        status: BookingStatus.CONFIRMED,
        createdAt: new Date(),
      };

      mockPrisma.teeTimeSlot.findUnique = jest.fn().mockResolvedValue(mockSlot);
      mockPrisma.member.findUnique = jest.fn().mockResolvedValue(mockMember);
      mockPrisma.teeTimeBooking.create = jest.fn().mockResolvedValue(mockBooking);
      mockPrisma.teeTimeSlot.update = jest.fn().mockResolvedValue({
        ...mockSlot,
        currentPlayers: 2,
      });

      const result = await teeTimeService.bookSlot({
        slotId: 'slot-1',
        memberId: 'member-1',
        playerCount: 2,
      });

      expect(result).toEqual(mockBooking);
      expect(mockPrisma.teeTimeBooking.create).toHaveBeenCalled();
      expect(mockPrisma.teeTimeSlot.update).toHaveBeenCalledWith({
        where: { id: 'slot-1' },
        data: {
          currentPlayers: 2,
          status: TeeTimeStatus.PARTIAL,
        },
      });
    });

    it('should throw error if slot is not available', async () => {
      const mockSlot = {
        id: 'slot-1',
        status: TeeTimeStatus.FULL,
        isBlocked: false,
        maxPlayers: 4,
        currentPlayers: 4,
      };

      mockPrisma.teeTimeSlot.findUnique = jest.fn().mockResolvedValue(mockSlot);

      await expect(
        teeTimeService.bookSlot({
          slotId: 'slot-1',
          memberId: 'member-1',
          playerCount: 2,
        })
      ).rejects.toThrow('Slot nicht verfügbar');
    });

    it('should throw error if slot is blocked', async () => {
      const mockSlot = {
        id: 'slot-1',
        status: TeeTimeStatus.AVAILABLE,
        isBlocked: true,
        maxPlayers: 4,
        currentPlayers: 0,
      };

      mockPrisma.teeTimeSlot.findUnique = jest.fn().mockResolvedValue(mockSlot);

      await expect(
        teeTimeService.bookSlot({
          slotId: 'slot-1',
          memberId: 'member-1',
          playerCount: 2,
        })
      ).rejects.toThrow('Slot ist blockiert');
    });

    it('should throw error if not enough capacity', async () => {
      const mockSlot = {
        id: 'slot-1',
        status: TeeTimeStatus.PARTIAL,
        isBlocked: false,
        maxPlayers: 4,
        currentPlayers: 3,
      };

      mockPrisma.teeTimeSlot.findUnique = jest.fn().mockResolvedValue(mockSlot);

      await expect(
        teeTimeService.bookSlot({
          slotId: 'slot-1',
          memberId: 'member-1',
          playerCount: 2, // Would exceed capacity
        })
      ).rejects.toThrow('Nicht genug Plätze verfügbar');
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking successfully before deadline', async () => {
      const futureDate = addDays(new Date(), 2);

      const mockBooking = {
        id: 'booking-1',
        slotId: 'slot-1',
        memberId: 'member-1',
        playerCount: 2,
        status: BookingStatus.CONFIRMED,
        slot: {
          date: futureDate,
          time: '08:00',
          currentPlayers: 2,
        },
      };

      const mockConfig = {
        cancellationHours: 24,
      };

      mockPrisma.teeTimeBooking.findUnique = jest.fn().mockResolvedValue(mockBooking);
      mockPrisma.teeTimeConfiguration.findFirst = jest.fn().mockResolvedValue(mockConfig);
      mockPrisma.teeTimeBooking.update = jest.fn().mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });
      mockPrisma.teeTimeSlot.update = jest.fn().mockResolvedValue({
        ...mockBooking.slot,
        currentPlayers: 0,
      });

      const result = await teeTimeService.cancelBooking({
        bookingId: 'booking-1',
        memberId: 'member-1',
      });

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(mockPrisma.teeTimeBooking.update).toHaveBeenCalled();
    });

    it('should throw error if past cancellation deadline', async () => {
      const soonDate = addDays(new Date(), 0.5); // 12 hours from now

      const mockBooking = {
        id: 'booking-1',
        memberId: 'member-1',
        status: BookingStatus.CONFIRMED,
        slot: {
          date: soonDate,
          time: '08:00',
        },
      };

      const mockConfig = {
        cancellationHours: 24, // 24 hours deadline
      };

      mockPrisma.teeTimeBooking.findUnique = jest.fn().mockResolvedValue(mockBooking);
      mockPrisma.teeTimeConfiguration.findFirst = jest.fn().mockResolvedValue(mockConfig);

      await expect(
        teeTimeService.cancelBooking({
          bookingId: 'booking-1',
          memberId: 'member-1',
        })
      ).rejects.toThrow('Stornierungsfrist überschritten');
    });

    it('should throw error if booking not owned by member', async () => {
      const mockBooking = {
        id: 'booking-1',
        memberId: 'member-1',
        status: BookingStatus.CONFIRMED,
        slot: {
          date: addDays(new Date(), 2),
          time: '08:00',
        },
      };

      mockPrisma.teeTimeBooking.findUnique = jest.fn().mockResolvedValue(mockBooking);

      await expect(
        teeTimeService.cancelBooking({
          bookingId: 'booking-1',
          memberId: 'member-2', // Different member
        })
      ).rejects.toThrow('Keine Berechtigung');
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available slots for a date', async () => {
      const mockSlots = [
        {
          id: 'slot-1',
          date: new Date('2025-11-20'),
          time: '08:00',
          status: TeeTimeStatus.AVAILABLE,
          currentPlayers: 0,
          maxPlayers: 4,
        },
        {
          id: 'slot-2',
          date: new Date('2025-11-20'),
          time: '08:10',
          status: TeeTimeStatus.PARTIAL,
          currentPlayers: 2,
          maxPlayers: 4,
        },
      ];

      mockPrisma.teeTimeSlot.findMany = jest.fn().mockResolvedValue(mockSlots);

      const result = await teeTimeService.getAvailableSlots({
        date: new Date('2025-11-20'),
      });

      expect(result).toEqual(mockSlots);
      expect(mockPrisma.teeTimeSlot.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          date: expect.any(Object),
          status: { in: [TeeTimeStatus.AVAILABLE, TeeTimeStatus.PARTIAL] },
        }),
      });
    });
  });
});
