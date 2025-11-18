import { Request, Response } from 'express';
import { pcCaddieSync } from './pccaddie-sync.service';
import { logger } from '../../shared/services/logger.service';

export class PCCaddieSyncController {
  /**
   * POST /api/v1/pccaddie/sync
   * Trigger full sync (Admin only)
   */
  async triggerSync(req: Request, res: Response) {
    try {
      logger.info('Manual PC Caddie sync triggered');

      // Run sync in background
      pcCaddieSync.syncAll().catch((error) => {
        logger.error('Background PC Caddie sync failed:', error);
      });

      res.json({
        message: 'PC Caddie sync started in background',
        status: 'processing',
      });
    } catch (error: any) {
      logger.error('Error triggering PC Caddie sync:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/pccaddie/sync/members
   * Sync only members (Admin only)
   */
  async syncMembers(req: Request, res: Response) {
    try {
      await pcCaddieSync.connect();
      await pcCaddieSync.syncMembers();
      await pcCaddieSync.disconnect();

      res.json({
        message: 'Members synced successfully',
        status: 'completed',
      });
    } catch (error: any) {
      logger.error('Error syncing members from PC Caddie:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/pccaddie/sync/tournaments
   * Sync only tournaments (Admin only)
   */
  async syncTournaments(req: Request, res: Response) {
    try {
      await pcCaddieSync.connect();
      await pcCaddieSync.syncTournaments();
      await pcCaddieSync.disconnect();

      res.json({
        message: 'Tournaments synced successfully',
        status: 'completed',
      });
    } catch (error: any) {
      logger.error('Error syncing tournaments from PC Caddie:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/pccaddie/sync/handicaps
   * Sync only handicaps (Admin only)
   */
  async syncHandicaps(req: Request, res: Response) {
    try {
      await pcCaddieSync.connect();
      await pcCaddieSync.syncHandicaps();
      await pcCaddieSync.disconnect();

      res.json({
        message: 'Handicaps synced successfully',
        status: 'completed',
      });
    } catch (error: any) {
      logger.error('Error syncing handicaps from PC Caddie:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/pccaddie/stats
   * Get sync statistics (Admin only)
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = await pcCaddieSync.getSyncStats();

      res.json(stats);
    } catch (error: any) {
      logger.error('Error getting PC Caddie sync stats:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const pcCaddieSyncController = new PCCaddieSyncController();
