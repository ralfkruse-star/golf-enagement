import { logger } from '../../config/logger';

/**
 * AI Service (OpenAI Integration)
 * Provides content recommendations, personalization, and insights
 */

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class AIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('⚠️  OPENAI_API_KEY not set - AI features will be disabled');
    }
  }

  /**
   * Generate personalized content recommendations for a member
   */
  async generateRecommendations(memberProfile: any): Promise<string[]> {
    if (!this.apiKey) return [];

    try {
      const prompt = `Du bist ein Golf-Experte. Basierend auf diesem Mitgliederprofil, empfehle 3 passende Aktivitäten:

Mitgliedstyp: ${memberProfile.membershipType}
Handicap: ${memberProfile.handicap || 'unbekannt'}
Bisherige Events: ${memberProfile.eventCount || 0}
Interessen: ${memberProfile.interests || 'allgemein'}

Gib 3 kurze, spezifische Empfehlungen.`;

      const response = await this.chat([
        { role: 'system', content: 'Du bist ein hilfreicher Golf-Assistent.' },
        { role: 'user', content: prompt },
      ]);

      const recommendations = response.split('\n').filter((r) => r.trim().length > 0);

      return recommendations;
    } catch (error) {
      logger.error('AI recommendations failed:', error);
      return [];
    }
  }

  /**
   * Generate automated email/push content
   */
  async generateNotificationContent(
    type: 'welcome' | 'event' | 'reminder',
    context: any
  ): Promise<{ title: string; body: string }> {
    if (!this.apiKey) {
      return this.getFallbackContent(type, context);
    }

    try {
      const prompts = {
        welcome: `Schreibe eine kurze, freundliche Willkommensnachricht für ein neues Mitglied (${context.membershipType}). Max. 50 Wörter.`,
        event: `Schreibe eine ansprechende Event-Ankündigung für: "${context.eventTitle}" am ${context.date}. Max. 40 Wörter.`,
        reminder: `Schreibe eine freundliche Erinnerung für das Event "${context.eventTitle}" morgen. Max. 30 Wörter.`,
      };

      const response = await this.chat([
        { role: 'system', content: 'Du bist ein freundlicher Golf-Club-Manager.' },
        { role: 'user', content: prompts[type] },
      ]);

      return {
        title: type === 'welcome' ? 'Willkommen!' : context.eventTitle || 'Erinnerung',
        body: response.trim(),
      };
    } catch (error) {
      logger.error('AI content generation failed:', error);
      return this.getFallbackContent(type, context);
    }
  }

  /**
   * Analyze member engagement and suggest interventions
   */
  async analyzeEngagement(memberStats: any): Promise<{
    engagementLevel: 'high' | 'medium' | 'low';
    suggestions: string[];
  }> {
    const { eventCount, feedPosts, lastLoginDays } = memberStats;

    let engagementLevel: 'high' | 'medium' | 'low' = 'medium';
    const suggestions: string[] = [];

    if (eventCount === 0 && lastLoginDays > 30) {
      engagementLevel = 'low';
      suggestions.push('Sende persönliche Einladung zu Einsteiger-Events');
      suggestions.push('Buddy-Programm anbieten');
    } else if (eventCount < 3 && lastLoginDays > 14) {
      engagementLevel = 'medium';
      suggestions.push('Event-Empfehlungen basierend auf Interessen');
    } else {
      engagementLevel = 'high';
      suggestions.push('Belohne aktive Teilnahme mit Achievement');
    }

    return { engagementLevel, suggestions };
  }

  /**
   * Chat with OpenAI
   */
  private async chat(messages: OpenAIMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Fallback content when AI is unavailable
   */
  private getFallbackContent(
    type: string,
    context: any
  ): { title: string; body: string } {
    const fallbacks = {
      welcome: {
        title: 'Willkommen im Golfclub Siek!',
        body: 'Wir freuen uns, Sie als neues Mitglied begrüßen zu dürfen. Viel Spaß!',
      },
      event: {
        title: context.eventTitle || 'Neues Event',
        body: `Ein neues Event wartet auf Sie: ${context.eventTitle}. Melden Sie sich jetzt an!`,
      },
      reminder: {
        title: 'Erinnerung',
        body: `Nicht vergessen: ${context.eventTitle} findet morgen statt!`,
      },
    };

    return fallbacks[type as keyof typeof fallbacks] || fallbacks.welcome;
  }
}

export const aiService = new AIService();
