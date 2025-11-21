import { brevoService } from '../../shared/services/brevo.service';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { logger } from '../../config/logger';

/**
 * Email Marketing Service
 * Manages email campaigns, newsletters, and broadcast emails using Brevo
 */

interface CampaignInput {
  name: string;
  subject: string;
  htmlContent: string;
  recipientType: 'all' | 'segment' | 'membershipType';
  recipientIds?: string[]; // Segment IDs or specific member IDs
  membershipTypes?: string[]; // If recipientType is 'membershipType'
  scheduledAt?: string; // ISO date for scheduling
}

interface BroadcastEmailInput {
  subject: string;
  htmlContent: string;
  recipientIds: string[]; // Specific member IDs
  tags?: string[];
}

export class EmailMarketingService {
  /**
   * Create and send an email campaign
   */
  async createCampaign(input: CampaignInput, createdBy: string) {
    try {
      // Get recipient list IDs based on type
      const listIds = await this.getRecipientListIds(input);

      // Create campaign in Brevo
      const campaign = await brevoService.createCampaign({
        name: input.name,
        subject: input.subject,
        sender: {
          email: process.env.CLUB_EMAIL || 'noreply@golfclub-siek.de',
          name: process.env.CLUB_NAME || 'Golfclub Siek',
        },
        htmlContent: input.htmlContent,
        recipients: {
          listIds,
        },
        scheduledAt: input.scheduledAt,
      });

      logger.info(`Campaign created: ${campaign.id} by ${createdBy}`);

      return {
        id: campaign.id,
        name: input.name,
        subject: input.subject,
        status: input.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: input.scheduledAt,
      };
    } catch (error) {
      logger.error('Failed to create campaign:', error);
      throw new AppError(500, 'Failed to create campaign');
    }
  }

  /**
   * Send a campaign immediately
   */
  async sendCampaign(campaignId: number) {
    try {
      await brevoService.sendCampaign(campaignId);
      logger.info(`Campaign ${campaignId} sent`);
    } catch (error) {
      logger.error(`Failed to send campaign ${campaignId}:`, error);
      throw new AppError(500, 'Failed to send campaign');
    }
  }

  /**
   * Send test campaign to specific emails
   */
  async sendTestCampaign(campaignId: number, testEmails: string[]) {
    try {
      await brevoService.sendCampaignTest(campaignId, testEmails);
      logger.info(`Test campaign ${campaignId} sent to ${testEmails.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to send test campaign ${campaignId}:`, error);
      throw new AppError(500, 'Failed to send test campaign');
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: number) {
    try {
      const stats = await brevoService.getCampaignStats(campaignId);
      return {
        campaignId,
        sent: stats.statistics?.sent || 0,
        delivered: stats.statistics?.delivered || 0,
        opens: stats.statistics?.uniqueOpens || 0,
        clicks: stats.statistics?.uniqueClicks || 0,
        unsubscribes: stats.statistics?.unsubscriptions || 0,
        bounces: stats.statistics?.hardBounces + stats.statistics?.softBounces || 0,
        status: stats.status,
      };
    } catch (error) {
      logger.error(`Failed to get campaign stats ${campaignId}:`, error);
      throw new AppError(500, 'Failed to get campaign statistics');
    }
  }

  /**
   * Send broadcast email to specific members
   */
  async sendBroadcastEmail(input: BroadcastEmailInput) {
    try {
      // Get member emails
      const members = await prisma.member.findMany({
        where: {
          id: { in: input.recipientIds },
          membershipStatus: 'ACTIVE',
        },
        select: { email: true, firstName: true, lastName: true },
      });

      if (members.length === 0) {
        throw new AppError(400, 'No active members found with given IDs');
      }

      // Send transactional email to each member
      const promises = members.map((member) =>
        brevoService.sendTransactionalEmail({
          to: [{ email: member.email, name: `${member.firstName} ${member.lastName}` }],
          subject: input.subject,
          htmlContent: input.htmlContent,
          tags: input.tags,
        })
      );

      await Promise.all(promises);

      logger.info(`Broadcast email sent to ${members.length} members`);

      return {
        recipientCount: members.length,
        success: true,
      };
    } catch (error) {
      logger.error('Failed to send broadcast email:', error);
      throw new AppError(500, 'Failed to send broadcast email');
    }
  }

  /**
   * Get Brevo contact lists
   */
  async getContactLists() {
    // For now, return predefined lists
    // In production, you'd fetch these from Brevo API
    return [
      {
        id: parseInt(process.env.BREVO_LIST_MEMBERS || '1'),
        name: 'Active Members',
        description: 'All active members',
      },
      {
        id: parseInt(process.env.BREVO_LIST_TRIAL || '2'),
        name: 'Trial Members',
        description: 'Trial and guest members',
      },
    ];
  }

  /**
   * Sync members to Brevo lists based on membership type
   */
  async syncMembersToBrevo() {
    try {
      const members = await prisma.member.findMany({
        where: { membershipStatus: 'ACTIVE' },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          membershipType: true,
          membershipStatus: true,
          handicap: true,
        },
      });

      const contacts = members.map((member) => ({
        email: member.email,
        attributes: {
          FIRSTNAME: member.firstName,
          LASTNAME: member.lastName,
          MEMBERSHIP_TYPE: member.membershipType,
          MEMBERSHIP_STATUS: member.membershipStatus,
          HANDICAP: member.handicap || undefined,
        },
        listIds:
          member.membershipType === 'GUEST' || member.membershipType === 'TRIAL'
            ? [parseInt(process.env.BREVO_LIST_TRIAL || '2')]
            : [parseInt(process.env.BREVO_LIST_MEMBERS || '1')],
        updateEnabled: true,
      }));

      await brevoService.syncContactsBulk(contacts);

      logger.info(`Synced ${members.length} members to Brevo`);

      return {
        syncedCount: members.length,
        success: true,
      };
    } catch (error) {
      logger.error('Failed to sync members to Brevo:', error);
      throw new AppError(500, 'Failed to sync members to Brevo');
    }
  }

  /**
   * Get email templates
   */
  getEmailTemplates() {
    return [
      {
        id: 'welcome',
        name: 'Welcome Email',
        description: 'Welcome new members',
      },
      {
        id: 'event_confirmation',
        name: 'Event Confirmation',
        description: 'Confirm event registration',
      },
      {
        id: 'newsletter',
        name: 'Newsletter',
        description: 'General newsletter template',
      },
      {
        id: 'announcement',
        name: 'Announcement',
        description: 'Important announcements',
      },
    ];
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getRecipientListIds(input: CampaignInput): Promise<number[]> {
    if (input.recipientType === 'all') {
      return [
        parseInt(process.env.BREVO_LIST_MEMBERS || '1'),
        parseInt(process.env.BREVO_LIST_TRIAL || '2'),
      ];
    }

    if (input.recipientType === 'membershipType' && input.membershipTypes) {
      const isTrial = input.membershipTypes.some((type) => ['GUEST', 'TRIAL'].includes(type));
      const isMember = input.membershipTypes.some((type) => !['GUEST', 'TRIAL'].includes(type));

      const lists: number[] = [];
      if (isMember) lists.push(parseInt(process.env.BREVO_LIST_MEMBERS || '1'));
      if (isTrial) lists.push(parseInt(process.env.BREVO_LIST_TRIAL || '2'));

      return lists;
    }

    // Default: all members
    return [parseInt(process.env.BREVO_LIST_MEMBERS || '1')];
  }
}

export const emailMarketingService = new EmailMarketingService();
