import { logger } from '../../config/logger';

/**
 * Brevo (Sendinblue) Integration Service
 * Handles email campaigns, transactional emails, and contact sync
 */

interface BrevoContact {
  email: string;
  attributes: {
    FIRSTNAME: string;
    LASTNAME: string;
    MEMBERSHIP_TYPE?: string;
    MEMBERSHIP_STATUS?: string;
    HANDICAP?: number;
    LANGUAGE?: string;
  };
  listIds?: number[];
  updateEnabled?: boolean;
}

interface BrevoTransactionalEmail {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  sender?: { email: string; name: string };
  replyTo?: { email: string; name?: string };
  tags?: string[];
  params?: Record<string, any>;
}

interface BrevoCampaign {
  name: string;
  subject: string;
  sender: { email: string; name: string };
  htmlContent: string;
  recipients: {
    listIds?: number[];
    segmentIds?: number[];
  };
  scheduledAt?: string; // ISO date
}

class BrevoService {
  private apiKey: string;
  private apiUrl = 'https://api.brevo.com/v3';

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('⚠️  BREVO_API_KEY not set - Email features will be disabled');
    }
  }

  private async request(endpoint: string, method: string = 'GET', body?: any) {
    if (!this.apiKey) {
      throw new Error('Brevo API key not configured');
    }

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Brevo API error: ${response.status} - ${error}`);
      throw new Error(`Brevo API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create or update a contact in Brevo
   */
  async syncContact(contact: BrevoContact): Promise<void> {
    try {
      await this.request('/contacts', 'POST', contact);
      logger.info(`Synced contact to Brevo: ${contact.email}`);
    } catch (error) {
      logger.error(`Failed to sync contact to Brevo: ${contact.email}`, error);
      throw error;
    }
  }

  /**
   * Sync multiple contacts in bulk
   */
  async syncContactsBulk(contacts: BrevoContact[]): Promise<void> {
    try {
      await this.request('/contacts/import', 'POST', {
        contacts,
        updateExistingContacts: true,
      });
      logger.info(`Bulk synced ${contacts.length} contacts to Brevo`);
    } catch (error) {
      logger.error(`Failed to bulk sync contacts to Brevo`, error);
      throw error;
    }
  }

  /**
   * Add contact to a list (e.g., "Active Members", "Trial Members")
   */
  async addContactToList(email: string, listId: number): Promise<void> {
    try {
      await this.request(`/contacts/lists/${listId}/contacts/add`, 'POST', {
        emails: [email],
      });
      logger.info(`Added ${email} to Brevo list ${listId}`);
    } catch (error) {
      logger.error(`Failed to add contact to list`, error);
      throw error;
    }
  }

  /**
   * Remove contact from a list
   */
  async removeContactFromList(email: string, listId: number): Promise<void> {
    try {
      await this.request(`/contacts/lists/${listId}/contacts/remove`, 'POST', {
        emails: [email],
      });
      logger.info(`Removed ${email} from Brevo list ${listId}`);
    } catch (error) {
      logger.error(`Failed to remove contact from list`, error);
      throw error;
    }
  }

  /**
   * Send a transactional email (e.g., welcome email, password reset)
   */
  async sendTransactionalEmail(email: BrevoTransactionalEmail): Promise<void> {
    try {
      await this.request('/smtp/email', 'POST', {
        ...email,
        sender: email.sender || {
          email: process.env.CLUB_EMAIL || 'noreply@golfclub-siek.de',
          name: process.env.CLUB_NAME || 'Golfclub Siek',
        },
      });
      logger.info(`Sent transactional email to ${email.to[0].email}`);
    } catch (error) {
      logger.error(`Failed to send transactional email`, error);
      throw error;
    }
  }

  /**
   * Create an email campaign (newsletter)
   */
  async createCampaign(campaign: BrevoCampaign): Promise<{ id: number }> {
    try {
      const result = await this.request('/emailCampaigns', 'POST', campaign);
      logger.info(`Created Brevo campaign: ${campaign.name} (ID: ${result.id})`);
      return result;
    } catch (error) {
      logger.error(`Failed to create campaign`, error);
      throw error;
    }
  }

  /**
   * Send a test email for a campaign
   */
  async sendCampaignTest(campaignId: number, emails: string[]): Promise<void> {
    try {
      await this.request(`/emailCampaigns/${campaignId}/sendTest`, 'POST', {
        emailTo: emails,
      });
      logger.info(`Sent test campaign ${campaignId} to ${emails.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to send test campaign`, error);
      throw error;
    }
  }

  /**
   * Send a campaign immediately or schedule it
   */
  async sendCampaign(campaignId: number, scheduledAt?: string): Promise<void> {
    try {
      await this.request(`/emailCampaigns/${campaignId}/sendNow`, 'POST', {
        scheduledAt,
      });
      logger.info(
        `Campaign ${campaignId} ${scheduledAt ? 'scheduled for ' + scheduledAt : 'sent immediately'}`
      );
    } catch (error) {
      logger.error(`Failed to send campaign`, error);
      throw error;
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: number): Promise<any> {
    try {
      return await this.request(`/emailCampaigns/${campaignId}`, 'GET');
    } catch (error) {
      logger.error(`Failed to get campaign stats`, error);
      throw error;
    }
  }

  /**
   * Delete a contact from Brevo
   */
  async deleteContact(email: string): Promise<void> {
    try {
      await this.request(`/contacts/${email}`, 'DELETE');
      logger.info(`Deleted contact from Brevo: ${email}`);
    } catch (error) {
      logger.error(`Failed to delete contact from Brevo`, error);
      throw error;
    }
  }
}

export const brevoService = new BrevoService();

/**
 * Pre-defined Email Templates
 */
export const emailTemplates = {
  /**
   * Welcome email for new members
   */
  welcome: (firstName: string, membershipType: string) => ({
    subject: `Willkommen im Golfclub Siek, ${firstName}! ⛳`,
    htmlContent: `
      <h1>Willkommen, ${firstName}!</h1>
      <p>Wir freuen uns, Sie als ${membershipType === 'GUEST' ? 'Gast' : 'Mitglied'} im Golfclub Siek begrüßen zu dürfen.</p>

      ${
        membershipType === 'GUEST' || membershipType === 'TRIAL'
          ? `
        <h2>Ihre ersten Schritte:</h2>
        <ul>
          <li>Laden Sie unsere App herunter und erkunden Sie die Community</li>
          <li>Melden Sie sich zu einem Schnupperkurs an</li>
          <li>Lernen Sie andere Mitglieder kennen</li>
          <li>Entdecken Sie unseren wunderschönen Platz</li>
        </ul>
        <p><strong>Wir helfen Ihnen, Golf lieben zu lernen!</strong></p>
      `
          : `
        <h2>Was Sie jetzt tun können:</h2>
        <ul>
          <li>Vervollständigen Sie Ihr Profil in der App</li>
          <li>Melden Sie sich zu Events an</li>
          <li>Vernetzen Sie sich mit anderen Mitgliedern</li>
        </ul>
      `
      }

      <p>Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.</p>
      <p>Beste Grüße,<br>Ihr Golfclub Siek Team</p>
    `,
  }),

  /**
   * Event registration confirmation
   */
  eventConfirmation: (firstName: string, eventTitle: string, eventDate: string) => ({
    subject: `Anmeldebestätigung: ${eventTitle}`,
    htmlContent: `
      <h1>Anmeldung bestätigt!</h1>
      <p>Hallo ${firstName},</p>
      <p>Ihre Anmeldung zu folgendem Event wurde bestätigt:</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h2>${eventTitle}</h2>
        <p><strong>Datum:</strong> ${eventDate}</p>
      </div>

      <p>Wir freuen uns auf Sie!</p>
      <p>Beste Grüße,<br>Ihr Golfclub Siek Team</p>
    `,
  }),

  /**
   * Password reset email
   */
  passwordReset: (firstName: string, resetLink: string) => ({
    subject: 'Passwort zurücksetzen - Golfclub Siek',
    htmlContent: `
      <h1>Passwort zurücksetzen</h1>
      <p>Hallo ${firstName},</p>
      <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
      <p>Klicken Sie auf den folgenden Link, um ein neues Passwort zu erstellen:</p>
      <p><a href="${resetLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Passwort zurücksetzen</a></p>
      <p>Dieser Link ist 1 Stunde gültig.</p>
      <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese Email.</p>
      <p>Beste Grüße,<br>Ihr Golfclub Siek Team</p>
    `,
  }),
};
