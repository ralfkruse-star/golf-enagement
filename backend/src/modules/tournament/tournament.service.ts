import { PrismaClient } from '@prisma/client';
import { logger } from '../../shared/services/logger.service';
import { websocketService } from '../../shared/services/websocket.service';

const prisma = new PrismaClient();

interface ScoreEntry {
  memberId: string;
  hole: number;
  strokes: number;
}

export class TournamentService {
  /**
   * Create tournament (admin)
   */
  async createTournament(data: {
    eventId: string;
    format: 'STROKE_PLAY' | 'STABLEFORD' | 'MATCH_PLAY';
    startTime: Date;
    holes: number;
  }) {
    const { eventId, format, startTime, holes } = data;

    const tournament = await prisma.tournament.create({
      data: {
        eventId,
        format,
        startTime,
        holes,
        status: 'SCHEDULED',
      },
      include: {
        event: true,
      },
    });

    logger.info(`Tournament created: ${tournament.id}`);
    return tournament;
  }

  /**
   * Start tournament (admin)
   */
  async startTournament(tournamentId: string) {
    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    // Notify via WebSocket
    websocketService.broadcast('tournament:started', {
      tournamentId,
      status: 'IN_PROGRESS',
    });

    logger.info(`Tournament started: ${tournamentId}`);
    return tournament;
  }

  /**
   * End tournament (admin)
   */
  async endTournament(tournamentId: string) {
    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Calculate final rankings
    await this.calculateFinalRankings(tournamentId);

    // Notify via WebSocket
    websocketService.broadcast('tournament:completed', {
      tournamentId,
      status: 'COMPLETED',
    });

    logger.info(`Tournament completed: ${tournamentId}`);
    return tournament;
  }

  /**
   * Submit score for a hole
   */
  async submitScore(params: {
    tournamentId: string;
    memberId: string;
    hole: number;
    strokes: number;
  }) {
    const { tournamentId, memberId, hole, strokes } = params;

    // Get or create tournament score
    let score = await prisma.tournamentScore.findFirst({
      where: {
        tournamentId,
        memberId,
      },
    });

    if (!score) {
      score = await prisma.tournamentScore.create({
        data: {
          tournamentId,
          memberId,
          holes: {},
          totalStrokes: 0,
          holesCompleted: 0,
        },
      });
    }

    // Update hole score
    const holes = (score.holes as any) || {};
    holes[hole] = strokes;

    const totalStrokes = Object.values(holes).reduce((sum: number, s: any) => sum + s, 0);
    const holesCompleted = Object.keys(holes).length;

    await prisma.tournamentScore.update({
      where: { id: score.id },
      data: {
        holes,
        totalStrokes,
        holesCompleted,
      },
    });

    // Recalculate leaderboard
    await this.updateLeaderboard(tournamentId);

    // Notify via WebSocket
    websocketService.broadcast('tournament:score_update', {
      tournamentId,
      memberId,
      hole,
      strokes,
      totalStrokes,
      holesCompleted,
    });

    logger.info(`Score submitted: Tournament ${tournamentId}, Member ${memberId}, Hole ${hole}, Strokes ${strokes}`);

    return { success: true, totalStrokes, holesCompleted };
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        scores: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                handicap: true,
              },
            },
          },
          orderBy: [
            { totalStrokes: 'asc' },
            { holesCompleted: 'desc' },
          ],
        },
      },
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Calculate rankings
    const leaderboard = tournament.scores.map((score, index) => ({
      rank: index + 1,
      memberId: score.memberId,
      memberName: `${score.member.firstName} ${score.member.lastName}`,
      handicap: score.member.handicap,
      totalStrokes: score.totalStrokes,
      holesCompleted: score.holesCompleted,
      toPar: score.totalStrokes - (tournament.holes / 18) * 72, // Simplified calculation
      holes: score.holes,
    }));

    return {
      tournament,
      leaderboard,
    };
  }

  /**
   * Update leaderboard (recalculate rankings)
   */
  private async updateLeaderboard(tournamentId: string) {
    const leaderboard = await this.getLeaderboard(tournamentId);

    // Broadcast updated leaderboard
    websocketService.broadcast('tournament:leaderboard_update', {
      tournamentId,
      leaderboard: leaderboard.leaderboard,
    });
  }

  /**
   * Calculate final rankings (Stableford, etc.)
   */
  private async calculateFinalRankings(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        scores: {
          include: {
            member: true,
          },
        },
      },
    });

    if (!tournament) return;

    // For Stableford, calculate points
    if (tournament.format === 'STABLEFORD') {
      for (const score of tournament.scores) {
        let stablefordPoints = 0;
        const holes = (score.holes as any) || {};

        for (const [hole, strokes] of Object.entries(holes)) {
          const par = 4; // Simplified - should get from course data
          const handicapStrokes = Math.floor((score.member.handicap || 0) / 18); // Simplified

          const points = this.calculateStablefordPoints(strokes as number, par, handicapStrokes);
          stablefordPoints += points;
        }

        await prisma.tournamentScore.update({
          where: { id: score.id },
          data: {
            stablefordPoints,
          },
        });
      }
    }

    logger.info(`Final rankings calculated for tournament ${tournamentId}`);
  }

  /**
   * Calculate Stableford points for a hole
   */
  private calculateStablefordPoints(strokes: number, par: number, handicapStrokes: number): number {
    const nett = strokes - handicapStrokes;
    const diff = par - nett;

    if (diff >= 3) return 5; // Albatross or better
    if (diff === 2) return 4; // Eagle
    if (diff === 1) return 3; // Birdie
    if (diff === 0) return 2; // Par
    if (diff === -1) return 1; // Bogey
    return 0; // Double bogey or worse
  }

  /**
   * Get member's score
   */
  async getMemberScore(tournamentId: string, memberId: string) {
    const score = await prisma.tournamentScore.findFirst({
      where: {
        tournamentId,
        memberId,
      },
    });

    return score;
  }

  /**
   * Get all active tournaments
   */
  async getActiveTournaments() {
    const tournaments = await prisma.tournament.findMany({
      where: {
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS'],
        },
      },
      include: {
        event: true,
        scores: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return tournaments;
  }
}

export const tournamentService = new TournamentService();
