import { Request, Response } from 'express';
import { teeTimeService } from './teetime.service';
import { z } from 'zod';
import { logger } from '../../shared/services/logger.service';

// Validation schemas
const generateSlotsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  course: z.string().optional(),
});

const bookSlotSchema = z.object({
  players: z.number().min(1).max(4),
  playerIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const blockSlotSchema = z.object({
  reason: z.string().min(1),
});

export class TeeTimeController {
  /**
   * GET /api/v1/tee-times
   * Get available tee-times for a date
   */
  async getSlots(req: Request, res: Response) {
    try {
      const { date, course } = req.query;

      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
      }

      const slots = await teeTimeService.getAvailableSlots({
        date,
        course: course as string,
      });

      res.json(slots);
    } catch (error: any) {
      logger.error('Error getting tee-time slots:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/tee-times/:slotId/book
   * Book a tee-time slot
   */
  async bookSlot(req: Request, res: Response) {
    try {
      const { slotId } = req.params;
      const memberId = (req as any).user.id;

      const validation = bookSlotSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const result = await teeTimeService.bookSlot({
        slotId,
        memberId,
        ...validation.data,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error booking tee-time:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('blocked') || error.message.includes('advance')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/v1/tee-times/bookings/:bookingId
   * Cancel a booking
   */
  async cancelBooking(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const memberId = (req as any).user.id;

      const result = await teeTimeService.cancelBooking({
        bookingId,
        memberId,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error cancelling booking:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('deadline')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/tee-times/bookings/me
   * Get member's bookings
   */
  async getMyBookings(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;
      const { upcoming } = req.query;

      const bookings = await teeTimeService.getMemberBookings(memberId, {
        upcoming: upcoming === 'false' ? false : true,
      });

      res.json(bookings);
    } catch (error: any) {
      logger.error('Error getting member bookings:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/tee-times/admin/generate
   * Generate tee-time slots (Admin only)
   */
  async generateSlots(req: Request, res: Response) {
    try {
      const validation = generateSlotsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const { startDate, endDate, course } = validation.data;

      const result = await teeTimeService.generateSlots({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        course,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error generating slots:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/tee-times/admin/:slotId/block
   * Block a tee-time slot (Admin only)
   */
  async blockSlot(req: Request, res: Response) {
    try {
      const { slotId } = req.params;

      const validation = blockSlotSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const slot = await teeTimeService.blockSlot({
        slotId,
        reason: validation.data.reason,
      });

      res.json(slot);
    } catch (error: any) {
      logger.error('Error blocking slot:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/v1/tee-times/admin/:slotId/block
   * Unblock a tee-time slot (Admin only)
   */
  async unblockSlot(req: Request, res: Response) {
    try {
      const { slotId } = req.params;

      const result = await teeTimeService.unblockSlot(slotId);

      res.json(result);
    } catch (error: any) {
      logger.error('Error unblocking slot:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/tee-times/statistics
   * Get tee-time statistics (Admin only)
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const stats = await teeTimeService.getStatistics({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(stats);
    } catch (error: any) {
      logger.error('Error getting statistics:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const teeTimeController = new TeeTimeController();
