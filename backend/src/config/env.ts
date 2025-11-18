import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // FCM
  FCM_SERVER_KEY: z.string().optional(),
  FCM_PROJECT_ID: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // File Upload
  MAX_FILE_SIZE: z.string().default('10485760'),
  UPLOAD_DIR: z.string().default('./uploads'),

  // Club
  CLUB_NAME: z.string().default('Golfclub Siek'),
  CLUB_EMAIL: z.string().email().default('info@golfclub-siek.de'),
  CLUB_WEBSITE: z.string().url().default('https://www.golfclub-siek.de'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsedEnv.error.format());
  process.exit(1);
}

export const env = {
  ...parsedEnv.data,
  PORT: parseInt(parsedEnv.data.PORT),
  RATE_LIMIT_WINDOW_MS: parseInt(parsedEnv.data.RATE_LIMIT_WINDOW_MS),
  RATE_LIMIT_MAX_REQUESTS: parseInt(parsedEnv.data.RATE_LIMIT_MAX_REQUESTS),
  MAX_FILE_SIZE: parseInt(parsedEnv.data.MAX_FILE_SIZE),
  CORS_ORIGINS: parsedEnv.data.CORS_ORIGIN.split(','),
};

export type Env = typeof env;
