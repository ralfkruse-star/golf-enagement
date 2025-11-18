import { Request, Response } from 'express';
import { handicapService } from './handicap.service';
import { z } from 'zod';
import { logger } from '../../shared/services/logger.service';

// Validation schemas
const submitRoundSchema = z.object({
  courseId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  strokes: z.number().int().min(18).max(200),
  coursePar: z.number().int().optional(),
  courseRating: z.number().optional(),
  slopeRating: z.number().int().optional(),
});

const getPlayingHandicapSchema = z.object({
  courseRating: z.number(),
  slopeRating: z.number().int(),
  coursePar: z.number().int(),
});

export class HandicapController {
  /**
   * POST /api/v1/handicap/rounds
   * Submit a round score
   */
  async submitRound(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;

      const validation = submitRoundSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const { date, ...rest } = validation.data;

      const result = await handicapService.submitRound({
        memberId,
        date: new Date(date),
        ...rest,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error submitting round:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/handicap/rounds/me
   * Get my rounds
   */
  async getMyRounds(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;
      const { limit, verified } = req.query;

      const rounds = await handicapService.getMemberRounds(memberId, {
        limit: limit ? parseInt(limit as string) : undefined,
        verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
      });

      res.json(rounds);
    } catch (error: any) {
      logger.error('Error getting member rounds:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/handicap/history/me
   * Get my handicap history
   */
  async getMyHistory(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;
      const { limit } = req.query;

      const history = await handicapService.getHandicapHistory(memberId, {
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(history);
    } catch (error: any) {
      logger.error('Error getting handicap history:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/handicap/playing-handicap
   * Calculate playing handicap for a specific course
   */
  async getPlayingHandicap(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;

      const validation = getPlayingHandicapSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const result = await handicapService.getPlayingHandicap({
        memberId,
        ...validation.data,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error calculating playing handicap:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/v1/handicap/rounds/:roundId
   * Delete a round
   */
  async deleteRound(req: Request, res: Response) {
    try {
      const { roundId } = req.params;
      const memberId = (req as any).user.id;

      const result = await handicapService.deleteRound(roundId, memberId);

      res.json(result);
    } catch (error: any) {
      logger.error('Error deleting round:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/handicap/admin/rounds/:roundId/verify
   * Verify a round (admin only)
   */
  async verifyRound(req: Request, res: Response) {
    try {
      const { roundId } = req.params;

      const result = await handicapService.verifyRound(roundId);

      res.json(result);
    } catch (error: any) {
      logger.error('Error verifying round:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/handicap/admin/stats
   * Get handicap statistics (admin only)
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = await handicapService.getHandicapStats();

      res.json(stats);
    } catch (error: any) {
      logger.error('Error getting handicap stats:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/handicap/members/:memberId/rounds
   * Get member's rounds (admin only)
   */
  async getMemberRounds(req: Request, res: Response) {
    try {
      const { memberId } = req.params;
      const { limit, verified } = req.query;

      const rounds = await handicapService.getMemberRounds(memberId, {
        limit: limit ? parseInt(limit as string) : undefined,
        verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
      });

      res.json(rounds);
    } catch (error: any) {
      logger.error('Error getting member rounds:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const handicapController = new HandicapController();
