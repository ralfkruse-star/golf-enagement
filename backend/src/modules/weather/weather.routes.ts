import { Router } from 'express';
import { weatherController } from './weather.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

/**
 * Weather Routes
 * Base path: /api/v1/weather
 */

// All routes require authentication
router.get(
  '/current',
  authenticate,
  weatherController.getCurrentWeather.bind(weatherController)
);

router.get(
  '/forecast',
  authenticate,
  weatherController.getForecast.bind(weatherController)
);

router.get(
  '/course-suitability',
  authenticate,
  weatherController.getCourseSuitability.bind(weatherController)
);

router.get(
  '/best-times',
  authenticate,
  weatherController.getBestPlayingTimes.bind(weatherController)
);

export default router;
