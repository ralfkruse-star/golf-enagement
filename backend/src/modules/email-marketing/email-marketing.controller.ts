import { Request, Response, NextFunction } from 'express';
import { emailMarketingService } from './email-marketing.service';
import { AppError } from '../../shared/middleware/error.middleware';

/**
 * Email Marketing Controller
 * Handles email campaign management and newsletter sending
 */

export class EmailMarketingController {
  /**
   * Create email campaign
   * POST /api/v1/email-marketing/campaigns
   */
  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, subject, htmlContent, recipientType, recipientIds, membershipTypes, scheduledAt } = req.body;

      if (!name || !subject || !htmlContent) {
        throw new AppError(400, 'Name, subject, and htmlContent are required');
      }

      const campaign = await emailMarketingService.createCampaign(
        {
          name,
          subject,
          htmlContent,
          recipientType: recipientType || 'all',
          recipientIds,
          membershipTypes,
          scheduledAt,
        },
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        data: campaign,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send campaign
   * POST /api/v1/email-marketing/campaigns/:id/send
   */
  async sendCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const campaignId = parseInt(req.params.id);

      await emailMarketingService.sendCampaign(campaignId);

      res.json({
        success: true,
        message: 'Campaign sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send test campaign
   * POST /api/v1/email-marketing/campaigns/:id/test
   */
  async sendTestCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const campaignId = parseInt(req.params.id);
      const { testEmails } = req.body;

      if (!testEmails || !Array.isArray(testEmails) || testEmails.length === 0) {
        throw new AppError(400, 'testEmails array is required');
      }

      await emailMarketingService.sendTestCampaign(campaignId, testEmails);

      res.json({
        success: true,
        message: 'Test campaign sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get campaign statistics
   * GET /api/v1/email-marketing/campaigns/:id/stats
   */
  async getCampaignStats(req: Request, res: Response, next: NextFunction) {
    try {
      const campaignId = parseInt(req.params.id);

      const stats = await emailMarketingService.getCampaignStats(campaignId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send broadcast email
   * POST /api/v1/email-marketing/broadcast
   */
  async sendBroadcastEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { subject, htmlContent, recipientIds, tags } = req.body;

      if (!subject || !htmlContent || !recipientIds || !Array.isArray(recipientIds)) {
        throw new AppError(400, 'Subject, htmlContent, and recipientIds are required');
      }

      const result = await emailMarketingService.sendBroadcastEmail({
        subject,
        htmlContent,
        recipientIds,
        tags,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contact lists
   * GET /api/v1/email-marketing/lists
   */
  async getContactLists(req: Request, res: Response, next: NextFunction) {
    try {
      const lists = await emailMarketingService.getContactLists();

      res.json({
        success: true,
        data: lists,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync members to Brevo
   * POST /api/v1/email-marketing/sync
   */
  async syncMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await emailMarketingService.syncMembersToBrevo();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get email templates
   * GET /api/v1/email-marketing/templates
   */
  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const templates = emailMarketingService.getEmailTemplates();

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const emailMarketingController = new EmailMarketingController();
