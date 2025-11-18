import { PrismaClient } from '@prisma/client';
import { logger } from '../../shared/services/logger.service';

const prisma = new PrismaClient();

export class HandicapService {
  /**
   * Submit a round score and calculate handicap
   */
  async submitRound(params: {
    memberId: string;
    courseId?: string;
    date: Date;
    strokes: number;
    coursePar?: number;
    courseRating?: number;
    slopeRating?: number;
  }) {
    const {
      memberId,
      courseId = 'main',
      date,
      strokes,
      coursePar = 72,
      courseRating = 72.0,
      slopeRating = 113,
    } = params;

    // Get member
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) throw new Error('Member not found');

    const handicapBefore = member.handicap || 54.0; // Max handicap if null

    // Calculate Score Differential
    const scoreDifferential = this.calculateScoreDifferential({
      score: strokes,
      courseRating,
      slopeRating,
      coursePar,
    });

    // Create round record
    const round = await prisma.round.create({
      data: {
        memberId,
        courseId,
        date,
        strokes,
        coursePar,
        courseRating,
        slopeRating,
        handicapBefore,
        verified: false,
      },
    });

    // Recalculate handicap
    const newHandicap = await this.calculateHandicap(memberId);

    // Update round with new handicap
    await prisma.round.update({
      where: { id: round.id },
      data: { handicapAfter: newHandicap },
    });

    // Update member handicap
    await prisma.member.update({
      where: { id: memberId },
      data: { handicap: newHandicap },
    });

    // Create handicap history entry
    await prisma.handicapHistory.create({
      data: {
        memberId,
        handicap: newHandicap,
        date,
        roundId: round.id,
        reason: 'Round submitted',
      },
    });

    logger.info(`Round submitted for member ${memberId}: ${strokes} strokes, handicap ${handicapBefore} → ${newHandicap}`);

    return {
      round,
      handicapBefore,
      handicapAfter: newHandicap,
      scoreDifferential,
    };
  }

  /**
   * Calculate Score Differential (per WHS)
   * Formula: (113 / Slope Rating) × (Adjusted Gross Score − Course Rating − PCC adjustment)
   */
  private calculateScoreDifferential(params: {
    score: number;
    courseRating: number;
    slopeRating: number;
    coursePar: number;
    pccAdjustment?: number;
  }): number {
    const { score, courseRating, slopeRating, pccAdjustment = 0 } = params;

    const differential =
      (113 / slopeRating) * (score - courseRating - pccAdjustment);

    return Math.round(differential * 10) / 10; // Round to 1 decimal
  }

  /**
   * Calculate Handicap Index using WHS
   * - Uses best 8 of last 20 scores
   * - If fewer than 20 scores, uses special calculation
   */
  async calculateHandicap(memberId: string): Promise<number> {
    // Get last 20 rounds (sorted by date, most recent first)
    const rounds = await prisma.round.findMany({
      where: {
        memberId,
        verified: true,
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    // If no verified rounds, check unverified
    if (rounds.length === 0) {
      const unverifiedRounds = await prisma.round.findMany({
        where: { memberId },
        orderBy: { date: 'desc' },
        take: 20,
      });

      if (unverifiedRounds.length === 0) {
        return 54.0; // Max handicap
      }

      // Use unverified rounds for calculation
      return this.calculateHandicapFromRounds(unverifiedRounds);
    }

    return this.calculateHandicapFromRounds(rounds);
  }

  /**
   * Calculate handicap from rounds
   */
  private calculateHandicapFromRounds(rounds: any[]): number {
    const roundCount = rounds.length;

    // Calculate differentials
    const differentials = rounds.map((round) =>
      this.calculateScoreDifferential({
        score: round.strokes,
        courseRating: round.courseRating,
        slopeRating: round.slopeRating,
        coursePar: round.coursePar,
      })
    );

    // Sort differentials (lowest first)
    differentials.sort((a, b) => a - b);

    let handicapIndex: number;

    if (roundCount >= 20) {
      // Best 8 of 20
      const best8 = differentials.slice(0, 8);
      const average = best8.reduce((sum, d) => sum + d, 0) / 8;
      handicapIndex = average - 0.96; // Bonus for excellence
    } else if (roundCount >= 9) {
      // Best 3 of 9-19
      const countToBest: Record<number, number> = {
        9: 3,
        10: 3,
        11: 3,
        12: 4,
        13: 4,
        14: 4,
        15: 5,
        16: 5,
        17: 5,
        18: 6,
        19: 6,
      };

      const bestCount = countToBest[roundCount] || 3;
      const bestN = differentials.slice(0, bestCount);
      const average = bestN.reduce((sum, d) => sum + d, 0) / bestN.length;
      handicapIndex = average - 0.96;
    } else if (roundCount >= 6) {
      // Best 2 of 6-8
      const best2 = differentials.slice(0, 2);
      const average = best2.reduce((sum, d) => sum + d, 0) / 2;
      handicapIndex = average - 1.0;
    } else if (roundCount >= 4) {
      // Best 1 of 4-5
      handicapIndex = differentials[0] - 1.0;
    } else if (roundCount === 3) {
      // Best 1 of 3
      handicapIndex = differentials[0] - 2.0;
    } else {
      // 1-2 rounds: Use lowest differential - 2.0
      handicapIndex = differentials[0] - 2.0;
    }

    // Ensure handicap is within valid range
    handicapIndex = Math.max(0, Math.min(54.0, handicapIndex));

    // Round to 1 decimal
    return Math.round(handicapIndex * 10) / 10;
  }

  /**
   * Verify a round (admin only)
   */
  async verifyRound(roundId: string) {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) throw new Error('Round not found');

    await prisma.round.update({
      where: { id: roundId },
      data: { verified: true },
    });

    // Recalculate handicap with verified round
    const newHandicap = await this.calculateHandicap(round.memberId);

    await prisma.member.update({
      where: { id: round.memberId },
      data: { handicap: newHandicap },
    });

    logger.info(`Round ${roundId} verified, handicap recalculated: ${newHandicap}`);

    return { success: true, newHandicap };
  }

  /**
   * Get member's rounds
   */
  async getMemberRounds(memberId: string, params?: {
    limit?: number;
    verified?: boolean;
  }) {
    const { limit = 20, verified } = params || {};

    const where: any = { memberId };
    if (verified !== undefined) {
      where.verified = verified;
    }

    const rounds = await prisma.round.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
    });

    return rounds;
  }

  /**
   * Get member's handicap history
   */
  async getHandicapHistory(memberId: string, params?: {
    limit?: number;
  }) {
    const { limit = 50 } = params || {};

    const history = await prisma.handicapHistory.findMany({
      where: { memberId },
      orderBy: { date: 'desc' },
      take: limit,
    });

    return history;
  }

  /**
   * Get playing handicap for a specific course
   * Playing Handicap = Handicap Index × (Slope Rating / 113) + (Course Rating − Par)
   */
  async getPlayingHandicap(params: {
    memberId: string;
    courseRating: number;
    slopeRating: number;
    coursePar: number;
  }) {
    const { memberId, courseRating, slopeRating, coursePar } = params;

    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) throw new Error('Member not found');

    const handicapIndex = member.handicap || 54.0;

    const playingHandicap =
      handicapIndex * (slopeRating / 113) + (courseRating - coursePar);

    return {
      handicapIndex,
      playingHandicap: Math.round(playingHandicap),
      courseRating,
      slopeRating,
      coursePar,
    };
  }

  /**
   * Delete a round
   */
  async deleteRound(roundId: string, memberId: string) {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) throw new Error('Round not found');
    if (round.memberId !== memberId) throw new Error('Unauthorized');

    await prisma.round.delete({
      where: { id: roundId },
    });

    // Recalculate handicap
    const newHandicap = await this.calculateHandicap(memberId);

    await prisma.member.update({
      where: { id: memberId },
      data: { handicap: newHandicap },
    });

    return { success: true, newHandicap };
  }

  /**
   * Get handicap statistics for all members
   */
  async getHandicapStats() {
    const members = await prisma.member.findMany({
      where: {
        handicap: { not: null },
      },
      select: {
        handicap: true,
      },
    });

    const handicaps = members.map((m) => m.handicap!).filter((h) => h !== null);

    if (handicaps.length === 0) {
      return {
        count: 0,
        average: 0,
        lowest: 0,
        highest: 0,
      };
    }

    const average =
      handicaps.reduce((sum, h) => sum + h, 0) / handicaps.length;
    const lowest = Math.min(...handicaps);
    const highest = Math.max(...handicaps);

    return {
      count: handicaps.length,
      average: Math.round(average * 10) / 10,
      lowest,
      highest,
    };
  }
}

export const handicapService = new HandicapService();
