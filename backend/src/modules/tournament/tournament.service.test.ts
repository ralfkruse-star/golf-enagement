import { TournamentService } from './tournament.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client');

describe('TournamentService', () => {
  let tournamentService: TournamentService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    tournamentService = new TournamentService();
    (tournamentService as any).prisma = mockPrisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTournament', () => {
    it('should create a tournament successfully', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Club Championship',
        eventType: 'TOURNAMENT',
      };

      const mockTournament = {
        id: 'tournament-1',
        eventId: 'event-1',
        format: 'STROKE_PLAY',
        status: 'SCHEDULED',
        startTime: new Date('2025-11-20T10:00:00Z'),
        endTime: null,
        holes: 18,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.event.findUnique = jest.fn().mockResolvedValue(mockEvent);
      mockPrisma.tournament.create = jest.fn().mockResolvedValue(mockTournament);

      const result = await tournamentService.createTournament({
        eventId: 'event-1',
        format: 'STROKE_PLAY',
        startTime: new Date('2025-11-20T10:00:00Z'),
        holes: 18,
      });

      expect(result).toEqual(mockTournament);
      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      });
      expect(mockPrisma.tournament.create).toHaveBeenCalled();
    });

    it('should throw error if event not found', async () => {
      mockPrisma.event.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        tournamentService.createTournament({
          eventId: 'invalid-event',
          format: 'STROKE_PLAY',
          startTime: new Date(),
          holes: 18,
        })
      ).rejects.toThrow('Event nicht gefunden');
    });
  });

  describe('submitScore', () => {
    it('should submit score for a hole successfully', async () => {
      const mockTournament = {
        id: 'tournament-1',
        status: 'IN_PROGRESS',
        format: 'STROKE_PLAY',
        holes: 18,
      };

      const mockScore = {
        id: 'score-1',
        tournamentId: 'tournament-1',
        memberId: 'member-1',
        holes: { '1': 4, '2': 5 },
        totalStrokes: 9,
        holesCompleted: 2,
        stablefordPoints: null,
      };

      mockPrisma.tournament.findUnique = jest.fn().mockResolvedValue(mockTournament);
      mockPrisma.tournamentScore.upsert = jest.fn().mockResolvedValue(mockScore);
      mockPrisma.tournamentScore.findMany = jest.fn().mockResolvedValue([mockScore]);

      const result = await tournamentService.submitScore({
        tournamentId: 'tournament-1',
        memberId: 'member-1',
        hole: 1,
        strokes: 4,
      });

      expect(result).toEqual(mockScore);
      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: 'tournament-1' },
      });
    });

    it('should throw error if tournament not in progress', async () => {
      const mockTournament = {
        id: 'tournament-1',
        status: 'SCHEDULED',
        format: 'STROKE_PLAY',
        holes: 18,
      };

      mockPrisma.tournament.findUnique = jest.fn().mockResolvedValue(mockTournament);

      await expect(
        tournamentService.submitScore({
          tournamentId: 'tournament-1',
          memberId: 'member-1',
          hole: 1,
          strokes: 4,
        })
      ).rejects.toThrow('Turnier ist nicht aktiv');
    });

    it('should throw error for invalid hole number', async () => {
      const mockTournament = {
        id: 'tournament-1',
        status: 'IN_PROGRESS',
        format: 'STROKE_PLAY',
        holes: 18,
      };

      mockPrisma.tournament.findUnique = jest.fn().mockResolvedValue(mockTournament);

      await expect(
        tournamentService.submitScore({
          tournamentId: 'tournament-1',
          memberId: 'member-1',
          hole: 19,
          strokes: 4,
        })
      ).rejects.toThrow('Ungültige Lochnummer');
    });
  });

  describe('getLeaderboard', () => {
    it('should return sorted leaderboard for stroke play', async () => {
      const mockTournament = {
        id: 'tournament-1',
        format: 'STROKE_PLAY',
        holes: 18,
      };

      const mockScores = [
        {
          id: 'score-1',
          memberId: 'member-1',
          totalStrokes: 75,
          holesCompleted: 18,
          stablefordPoints: null,
          member: { firstName: 'Anna', lastName: 'Schmidt' },
        },
        {
          id: 'score-2',
          memberId: 'member-2',
          totalStrokes: 72,
          holesCompleted: 18,
          stablefordPoints: null,
          member: { firstName: 'Max', lastName: 'Mustermann' },
        },
      ];

      mockPrisma.tournament.findUnique = jest.fn().mockResolvedValue(mockTournament);
      mockPrisma.tournamentScore.findMany = jest.fn().mockResolvedValue(mockScores);

      const result = await tournamentService.getLeaderboard('tournament-1');

      // Should be sorted by totalStrokes ascending (lower is better)
      expect(result[0].totalStrokes).toBe(72);
      expect(result[1].totalStrokes).toBe(75);
    });

    it('should return sorted leaderboard for stableford', async () => {
      const mockTournament = {
        id: 'tournament-1',
        format: 'STABLEFORD',
        holes: 18,
      };

      const mockScores = [
        {
          id: 'score-1',
          memberId: 'member-1',
          totalStrokes: 75,
          holesCompleted: 18,
          stablefordPoints: 32,
          member: { firstName: 'Anna', lastName: 'Schmidt' },
        },
        {
          id: 'score-2',
          memberId: 'member-2',
          totalStrokes: 72,
          holesCompleted: 18,
          stablefordPoints: 36,
          member: { firstName: 'Max', lastName: 'Mustermann' },
        },
      ];

      mockPrisma.tournament.findUnique = jest.fn().mockResolvedValue(mockTournament);
      mockPrisma.tournamentScore.findMany = jest.fn().mockResolvedValue(mockScores);

      const result = await tournamentService.getLeaderboard('tournament-1');

      // Should be sorted by stablefordPoints descending (higher is better)
      expect(result[0].stablefordPoints).toBe(36);
      expect(result[1].stablefordPoints).toBe(32);
    });
  });

  describe('startTournament', () => {
    it('should start a scheduled tournament', async () => {
      const mockTournament = {
        id: 'tournament-1',
        status: 'SCHEDULED',
      };

      const mockUpdatedTournament = {
        ...mockTournament,
        status: 'IN_PROGRESS',
      };

      mockPrisma.tournament.findUnique = jest.fn().mockResolvedValue(mockTournament);
      mockPrisma.tournament.update = jest.fn().mockResolvedValue(mockUpdatedTournament);

      const result = await tournamentService.startTournament('tournament-1');

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
        where: { id: 'tournament-1' },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('should throw error if tournament already started', async () => {
      const mockTournament = {
        id: 'tournament-1',
        status: 'IN_PROGRESS',
      };

      mockPrisma.tournament.findUnique = jest.fn().mockResolvedValue(mockTournament);

      await expect(
        tournamentService.startTournament('tournament-1')
      ).rejects.toThrow('Turnier ist bereits gestartet');
    });
  });

  describe('endTournament', () => {
    it('should end an in-progress tournament', async () => {
      const mockTournament = {
        id: 'tournament-1',
        status: 'IN_PROGRESS',
      };

      const mockUpdatedTournament = {
        ...mockTournament,
        status: 'COMPLETED',
        endTime: new Date(),
      };

      mockPrisma.tournament.findUnique = jest.fn().mockResolvedValue(mockTournament);
      mockPrisma.tournament.update = jest.fn().mockResolvedValue(mockUpdatedTournament);

      const result = await tournamentService.endTournament('tournament-1');

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.tournament.update).toHaveBeenCalled();
    });
  });

  describe('calculateStablefordPoints', () => {
    it('should calculate stableford points correctly', () => {
      // Par 4, Handicap 10, Strokes 5
      const points = (tournamentService as any).calculateStablefordPoints(5, 4, 10);
      expect(points).toBe(1); // Bogey = 1 point

      // Par 4, Handicap 10, Strokes 4
      const parPoints = (tournamentService as any).calculateStablefordPoints(4, 4, 10);
      expect(parPoints).toBe(2); // Par = 2 points

      // Par 4, Handicap 10, Strokes 3
      const birdiePoints = (tournamentService as any).calculateStablefordPoints(3, 4, 10);
      expect(birdiePoints).toBe(3); // Birdie = 3 points

      // Par 4, Handicap 10, Strokes 6
      const doubleBogeyPoints = (tournamentService as any).calculateStablefordPoints(6, 4, 10);
      expect(doubleBogeyPoints).toBe(0); // Double bogey or worse = 0 points
    });
  });
});
