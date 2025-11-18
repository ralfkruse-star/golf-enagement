import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export const jwtService = {
  generateAccessToken(userId: string, email: string, role: string): string {
    const payload: JwtPayload = {
      userId,
      email,
      role,
      type: 'access',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    });
  },

  generateRefreshToken(userId: string, email: string, role: string): string {
    const payload: JwtPayload = {
      userId,
      email,
      role,
      type: 'refresh',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    });
  },

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },

  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  },
};
