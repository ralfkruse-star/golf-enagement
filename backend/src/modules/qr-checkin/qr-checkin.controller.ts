import { Request, Response } from 'express';
import { qrCheckInService } from './qr-checkin.service';
import { z } from 'zod';
import { logger } from '../../shared/services/logger.service';

// Validation schemas
const generateEventQRSchema = z.object({
  eventId: z.string().uuid(),
});

const generateTeeTimeQRSchema = z.object({
  bookingId: z.string().uuid(),
});

const processCheckInSchema = z.object({
  qrData: z.string(),
});

export class QRCheckInController {
  /**
   * POST /api/v1/qr/event
   * Generate QR code for event
   */
  async generateEventQR(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;

      const validation = generateEventQRSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const qrCode = await qrCheckInService.generateEventQRCode({
        eventId: validation.data.eventId,
        memberId,
      });

      res.json({ qrCode });
    } catch (error: any) {
      logger.error('Error generating event QR code:', error);

      if (error.message.includes('not found') || error.message.includes('No confirmed')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/qr/teetime
   * Generate QR code for tee-time
   */
  async generateTeeTimeQR(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;

      const validation = generateTeeTimeQRSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const qrCode = await qrCheckInService.generateTeeTimeQRCode({
        bookingId: validation.data.bookingId,
        memberId,
      });

      res.json({ qrCode });
    } catch (error: any) {
      logger.error('Error generating tee-time QR code:', error);

      if (error.message.includes('not found') || error.message.includes('No confirmed')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/qr/checkin
   * Process QR code check-in (admin/staff)
   */
  async processCheckIn(req: Request, res: Response) {
    try {
      const validation = processCheckInSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const result = await qrCheckInService.processCheckIn(validation.data.qrData);

      res.json(result);
    } catch (error: any) {
      logger.error('Error processing QR check-in:', error);

      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return res.status(400).json({ error: error.message });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/qr/next-event
   * Get QR code for member's next event
   */
  async getMyNextEventQR(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;

      const result = await qrCheckInService.getMyNextEventQR(memberId);

      res.json(result);
    } catch (error: any) {
      logger.error('Error getting next event QR:', error);

      if (error.message.includes('not found') || error.message.includes('No upcoming')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/qr/next-teetime
   * Get QR code for member's next tee-time
   */
  async getMyNextTeeTimeQR(req: Request, res: Response) {
    try {
      const memberId = (req as any).user.id;

      const result = await qrCheckInService.getMyNextTeeTimeQR(memberId);

      res.json(result);
    } catch (error: any) {
      logger.error('Error getting next tee-time QR:', error);

      if (error.message.includes('not found') || error.message.includes('No upcoming')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: error.message });
    }
  }
}

export const qrCheckInController = new QRCheckInController();
