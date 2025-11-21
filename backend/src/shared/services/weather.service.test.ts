import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WeatherService } from './weather.service';

// Mock environment
vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('WeatherService', () => {
  let service: any;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENWEATHER_API_KEY = mockApiKey;

    // Re-import service after setting env var
    const { WeatherService } = require('./weather.service');
    service = new WeatherService();
  });

  afterEach(() => {
    delete process.env.OPENWEATHER_API_KEY;
  });

  describe('getCurrentWeather', () => {
    it('should fetch and return current weather data', async () => {
      const mockWeatherResponse = {
        main: {
          temp: 15.5,
          humidity: 70,
        },
        weather: [
          {
            description: 'teilweise bewölkt',
          },
        ],
        wind: {
          speed: 5.5, // m/s
        },
        rain: {
          '1h': 0.2,
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockWeatherResponse,
      });

      const result = await service.getCurrentWeather();

      expect(result).toEqual({
        temperature: 16, // Rounded from 15.5
        condition: 'teilweise bewölkt',
        precipitation: 0.2,
        windSpeed: 20, // 5.5 m/s * 3.6 = 19.8, rounded to 20
        humidity: 70,
      });
    });

    it('should return null if API key is not set', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      const { WeatherService } = require('./weather.service');
      const serviceWithoutKey = new WeatherService();

      const result = await serviceWithoutKey.getCurrentWeather();

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return null on API error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await service.getCurrentWeather();

      expect(result).toBeNull();
    });

    it('should handle missing rain data', async () => {
      const mockWeatherResponse = {
        main: {
          temp: 20,
          humidity: 60,
        },
        weather: [{ description: 'klar' }],
        wind: { speed: 3 },
        // No rain property
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockWeatherResponse,
      });

      const result = await service.getCurrentWeather();

      expect(result?.precipitation).toBe(0);
    });
  });

  describe('getForecast', () => {
    it('should fetch and return forecast data for specified days', async () => {
      const mockForecastResponse = {
        list: Array.from({ length: 40 }, (_, i) => ({
          main: {
            temp: 15 + i,
            humidity: 70,
          },
          weather: [{ description: 'sonnig' }],
          wind: { speed: 5 },
          rain: { '3h': 0 },
        })),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockForecastResponse,
      });

      const result = await service.getForecast(3);

      expect(result).toHaveLength(3);
      expect(result[0].temperature).toBe(15);
      expect(result[0].condition).toBe('sonnig');
    });

    it('should return empty array if API key is not set', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      const { WeatherService } = require('./weather.service');
      const serviceWithoutKey = new WeatherService();

      const result = await serviceWithoutKey.getForecast(5);

      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return empty array on API error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await service.getForecast(5);

      expect(result).toEqual([]);
    });
  });

  describe('getCourseSuitability', () => {
    it('should return perfect conditions for ideal weather', async () => {
      service.getCurrentWeather = vi.fn().mockResolvedValue({
        temperature: 20,
        condition: 'sonnig',
        precipitation: 0,
        windSpeed: 10,
        humidity: 60,
      });

      const result = await service.getCourseSuitability();

      expect(result.playable).toBe(true);
      expect(result.score).toBe(100);
      expect(result.warnings).toHaveLength(0);
      expect(result.recommendation).toContain('Perfekte Bedingungen');
    });

    it('should penalize score for low temperatures', async () => {
      service.getCurrentWeather = vi.fn().mockResolvedValue({
        temperature: 3,
        condition: 'kalt',
        precipitation: 0,
        windSpeed: 10,
        humidity: 60,
      });

      const result = await service.getCourseSuitability();

      expect(result.score).toBe(80); // 100 - 20 for low temp
      expect(result.warnings).toContain('Niedrige Temperaturen');
    });

    it('should penalize score for high temperatures', async () => {
      service.getCurrentWeather = vi.fn().mockResolvedValue({
        temperature: 32,
        condition: 'heiß',
        precipitation: 0,
        windSpeed: 10,
        humidity: 60,
      });

      const result = await service.getCourseSuitability();

      expect(result.score).toBe(90); // 100 - 10 for high temp
      expect(result.warnings).toContain('Hohe Temperaturen');
    });

    it('should penalize score for heavy rain', async () => {
      service.getCurrentWeather = vi.fn().mockResolvedValue({
        temperature: 20,
        condition: 'Regen',
        precipitation: 6,
        windSpeed: 10,
        humidity: 80,
      });

      const result = await service.getCourseSuitability();

      expect(result.score).toBe(60); // 100 - 40 for heavy rain
      expect(result.warnings).toContain('Starker Regen');
      expect(result.playable).toBe(true); // Still above 40
    });

    it('should penalize score for strong wind', async () => {
      service.getCurrentWeather = vi.fn().mockResolvedValue({
        temperature: 20,
        condition: 'windig',
        precipitation: 0,
        windSpeed: 45,
        humidity: 60,
      });

      const result = await service.getCourseSuitability();

      expect(result.score).toBe(70); // 100 - 30 for strong wind
      expect(result.warnings).toContain('Starker Wind');
    });

    it('should mark as unplayable for very poor conditions', async () => {
      service.getCurrentWeather = vi.fn().mockResolvedValue({
        temperature: 3,
        condition: 'Sturm',
        precipitation: 10,
        windSpeed: 50,
        humidity: 90,
      });

      const result = await service.getCourseSuitability();

      expect(result.score).toBeLessThan(40);
      expect(result.playable).toBe(false);
      expect(result.recommendation).toContain('nicht bespielbar');
    });

    it('should return default data when weather API fails', async () => {
      service.getCurrentWeather = vi.fn().mockResolvedValue(null);

      const result = await service.getCourseSuitability();

      expect(result.playable).toBe(true);
      expect(result.score).toBe(50);
      expect(result.warnings).toContain('Wetterdaten nicht verfügbar');
    });
  });

  describe('getBestPlayingTimes', () => {
    it('should return best playing times for next 3 days', async () => {
      const mockForecast = [
        {
          temperature: 20,
          condition: 'sonnig',
          precipitation: 0,
          windSpeed: 10,
          humidity: 60,
        },
        {
          temperature: 18,
          condition: 'bewölkt',
          precipitation: 2,
          windSpeed: 20,
          humidity: 70,
        },
        {
          temperature: 15,
          condition: 'Regen',
          precipitation: 5,
          windSpeed: 30,
          humidity: 80,
        },
      ];

      service.getForecast = vi.fn().mockResolvedValue(mockForecast);

      const result = await service.getBestPlayingTimes();

      expect(result).toHaveLength(3);
      expect(result[0].score).toBe(100); // Perfect conditions
      expect(result[0].time).toBe('Ganztägig');
      expect(result[1].score).toBeLessThan(70); // Some weather issues
      expect(result[1].time).not.toBe('Ganztägig');
      expect(result[2].score).toBeLessThan(50); // Poor conditions
    });

    it('should return empty array if forecast fails', async () => {
      service.getForecast = vi.fn().mockResolvedValue([]);

      const result = await service.getBestPlayingTimes();

      expect(result).toEqual([]);
    });
  });
});
