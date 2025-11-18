import { Request, Response } from 'express';
import { tournamentService } from './tournament.service';
import { z } from 'zod';
import { logger } from '../../shared/services/logger.service';

const createTournamentSchema = z.object({
  eventId: z.string().uuid(),
  format: z.enum(['STROKE_PLAY', 'STABLEFORD', 'MATCH_PLAY']),
  startTime: z.string(),
  holes: z.number().int().min(9).max(18),
});

const submitScoreSchema = z.object({
  hole: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(20),
});

export class TournamentController {
  /**
   * POST /api/v1/tournaments (Admin)
   */
  async createTournament(req: Request, res: Response) {
    try {
      const validation = createTournamentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const tournament = await tournamentService.createTournament({
        ...validation.data,
        startTime: new Date(validation.data.startTime),
      });

      res.json(tournament);
    } catch (error: any) {
      logger.error('Error creating tournament:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/tournaments/:id/start (Admin)
   */
  async startTournament(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tournament = await tournamentService.startTournament(id);

      res.json(tournament);
    } catch (error: any) {
      logger.error('Error starting tournament:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/tournaments/:id/end (Admin)
   */
  async endTournament(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tournament = await tournamentService.endTournament(id);

      res.json(tournament);
    } catch (error: any) {
      logger.error('Error ending tournament:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/tournaments/:id/score
   */
  async submitScore(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const memberId = (req as any).user.id;

      const validation = submitScoreSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const result = await tournamentService.submitScore({
        tournamentId: id,
        memberId,
        ...validation.data,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error submitting score:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/tournaments/:id/leaderboard
   */
  async getLeaderboard(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const leaderboard = await tournamentService.getLeaderboard(id);

      res.json(leaderboard);
    } catch (error: any) {
      logger.error('Error getting leaderboard:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/tournaments/:id/my-score
   */
  async getMyScore(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const memberId = (req as any).user.id;

      const score = await tournamentService.getMemberScore(id, memberId);

      res.json(score || { holes: {}, totalStrokes: 0, holesCompleted: 0 });
    } catch (error: any) {
      logger.error('Error getting member score:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/tournaments/active
   */
  async getActiveTournaments(req: Request, res: Response) {
    try {
      const tournaments = await tournamentService.getActiveTournaments();

      res.json(tournaments);
    } catch (error: any) {
      logger.error('Error getting active tournaments:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const tournamentController = new TournamentController();
