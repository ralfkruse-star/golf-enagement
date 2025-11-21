import { Request, Response, NextFunction } from 'express';
import { weatherService } from '../../shared/services/weather.service';

/**
 * Weather Controller
 * Handles weather data and course playability
 */

export class WeatherController {
  /**
   * Get current weather
   * GET /api/v1/weather/current
   */
  async getCurrentWeather(req: Request, res: Response, next: NextFunction) {
    try {
      const weather = await weatherService.getCurrentWeather();

      res.json({
        success: true,
        data: weather,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get weather forecast
   * GET /api/v1/weather/forecast?days=5
   */
  async getForecast(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 5;

      if (days < 1 || days > 7) {
        return res.status(400).json({
          success: false,
          error: 'Days must be between 1 and 7',
        });
      }

      const forecast = await weatherService.getForecast(days);

      res.json({
        success: true,
        data: {
          forecast,
          days,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get course playability
   * GET /api/v1/weather/course-suitability
   */
  async getCourseSuitability(req: Request, res: Response, next: NextFunction) {
    try {
      const suitability = await weatherService.getCourseSuitability();

      res.json({
        success: true,
        data: suitability,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get best playing times
   * GET /api/v1/weather/best-times
   */
  async getBestPlayingTimes(req: Request, res: Response, next: NextFunction) {
    try {
      const bestTimes = await weatherService.getBestPlayingTimes();

      res.json({
        success: true,
        data: {
          bestTimes,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const weatherController = new WeatherController();
