import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    membershipType: z.enum(['FULL', 'JUNIOR', 'SENIOR', 'GUEST', 'HONORARY', 'TRIAL']),
    birthDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

const requestPasswordResetSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string(),
    newPassword: z.string().min(8),
  }),
});

// Routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/password/request-reset', validate(requestPasswordResetSchema), authController.requestPasswordReset);
router.post('/password/reset', validate(resetPasswordSchema), authController.resetPassword);

export default router;
