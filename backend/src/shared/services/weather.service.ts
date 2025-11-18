import { logger } from '../../config/logger';

/**
 * Weather Service
 * Fetches weather data for course status and event planning
 */

interface WeatherData {
  temperature: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
}

interface CourseSuitability {
  playable: boolean;
  score: number; // 0-100
  warnings: string[];
  recommendation: string;
}

class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private clubLocation = { lat: 53.6358, lon: 10.2664 }; // Golfclub Siek

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('⚠️  OPENWEATHER_API_KEY not set - Weather features will be disabled');
    }
  }

  /**
   * Get current weather for club location
   */
  async getCurrentWeather(): Promise<WeatherData | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}/weather?lat=${this.clubLocation.lat}&lon=${this.clubLocation.lon}&appid=${this.apiKey}&units=metric&lang=de`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].description,
        precipitation: data.rain?.['1h'] || 0,
        windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
        humidity: data.main.humidity,
      };
    } catch (error) {
      logger.error('Failed to fetch weather:', error);
      return null;
    }
  }

  /**
   * Get weather forecast for next 5 days
   */
  async getForecast(days = 5): Promise<WeatherData[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(
        `${this.baseUrl}/forecast?lat=${this.clubLocation.lat}&lon=${this.clubLocation.lon}&appid=${this.apiKey}&units=metric&lang=de`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      // Get daily forecast (one per day at noon)
      const dailyForecasts = data.list
        .filter((item: any, index: number) => index % 8 === 0) // Every 8th item = ~24h
        .slice(0, days)
        .map((item: any) => ({
          temperature: Math.round(item.main.temp),
          condition: item.weather[0].description,
          precipitation: item.rain?.['3h'] || 0,
          windSpeed: Math.round(item.wind.speed * 3.6),
          humidity: item.main.humidity,
        }));

      return dailyForecasts;
    } catch (error) {
      logger.error('Failed to fetch forecast:', error);
      return [];
    }
  }

  /**
   * Evaluate course playability based on weather
   */
  async getCourseSuitability(): Promise<CourseSuitability> {
    const weather = await this.getCurrentWeather();

    if (!weather) {
      return {
        playable: true,
        score: 50,
        warnings: ['Wetterdaten nicht verfügbar'],
        recommendation: 'Bitte vor Ort informieren',
      };
    }

    const warnings: string[] = [];
    let score = 100;

    // Temperature check
    if (weather.temperature < 5) {
      score -= 20;
      warnings.push('Niedrige Temperaturen');
    } else if (weather.temperature > 30) {
      score -= 10;
      warnings.push('Hohe Temperaturen - ausreichend Wasser mitnehmen');
    }

    // Precipitation check
    if (weather.precipitation > 5) {
      score -= 40;
      warnings.push('Starker Regen - Platz evtl. gesperrt');
    } else if (weather.precipitation > 1) {
      score -= 15;
      warnings.push('Leichter Regen - Regenkleidung empfohlen');
    }

    // Wind check
    if (weather.windSpeed > 40) {
      score -= 30;
      warnings.push('Starker Wind');
    } else if (weather.windSpeed > 25) {
      score -= 10;
      warnings.push('Mäßiger Wind');
    }

    // Generate recommendation
    let recommendation = '';
    if (score >= 80) {
      recommendation = '✅ Perfekte Bedingungen zum Golfen!';
    } else if (score >= 60) {
      recommendation = '⚠️ Spielbar, aber nicht ideal';
    } else if (score >= 40) {
      recommendation = '❌ Schwierige Bedingungen';
    } else {
      recommendation = '🚫 Platz wahrscheinlich nicht bespielbar';
    }

    return {
      playable: score >= 40,
      score,
      warnings,
      recommendation,
    };
  }

  /**
   * Get best playing times for next 3 days
   */
  async getBestPlayingTimes(): Promise<Array<{ date: string; time: string; score: number }>> {
    const forecast = await this.getForecast(3);

    if (forecast.length === 0) return [];

    return forecast.map((weather, dayIndex) => {
      const date = new Date();
      date.setDate(date.getDate() + dayIndex);

      let score = 100;
      if (weather.precipitation > 1) score -= 30;
      if (weather.windSpeed > 25) score -= 20;
      if (weather.temperature < 10 || weather.temperature > 28) score -= 15;

      return {
        date: date.toLocaleDateString('de-DE'),
        time: score >= 70 ? 'Ganztägig' : score >= 50 ? 'Vormittags' : 'Prüfen',
        score,
      };
    });
  }
}

export const weatherService = new WeatherService();
