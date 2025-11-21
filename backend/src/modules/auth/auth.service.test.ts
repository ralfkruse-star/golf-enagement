import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { prisma } from '../../database/prisma';
import { passwordService } from '../../shared/utils/password';
import { jwtService } from '../../shared/utils/jwt';

// Mock dependencies
vi.mock('../../database/prisma', () => ({
  prisma: {
    member: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../../shared/utils/password', () => ({
  passwordService: {
    hash: vi.fn(),
    compare: vi.fn(),
    validate: vi.fn(),
  },
}));

vi.mock('../../shared/utils/jwt', () => ({
  jwtService: {
    generateTokens: vi.fn(),
  },
}));

vi.mock('../../shared/services/brevo.service', () => ({
  brevoService: {
    syncContact: vi.fn(),
    sendEmail: vi.fn(),
  },
  emailTemplates: {
    welcome: vi.fn().mockReturnValue({
      subject: 'Welcome',
      html: '<p>Welcome</p>',
    }),
  },
}));

vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService();
  });

  describe('register', () => {
    it('should successfully register a new member', async () => {
      const registerInput = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        membershipType: 'FULL' as const,
      };

      (prisma.member.findUnique as any).mockResolvedValue(null);
      (passwordService.validate as any).mockReturnValue({ valid: true, errors: [] });
      (passwordService.hash as any).mockResolvedValue('hashed_password');
      (prisma.member.count as any).mockResolvedValue(99);
      (prisma.member.create as any).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        membershipType: 'FULL',
        membershipStatus: 'PENDING',
        membershipNumber: 'GCS-000100',
        role: 'MEMBER',
      });
      (jwtService.generateTokens as any).mockReturnValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });

      const result = await service.register(registerInput);

      expect(result).toHaveProperty('member');
      expect(result).toHaveProperty('tokens');
      expect(prisma.member.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            password: 'hashed_password',
            firstName: 'John',
            lastName: 'Doe',
          }),
        })
      );
    });

    it('should throw error if email already exists', async () => {
      const registerInput = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        membershipType: 'FULL' as const,
      };

      (prisma.member.findUnique as any).mockResolvedValue({ id: '1', email: 'existing@example.com' });

      await expect(service.register(registerInput)).rejects.toThrow('Email already registered');
    });

    it('should throw error for invalid password', async () => {
      const registerInput = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        membershipType: 'FULL' as const,
      };

      (prisma.member.findUnique as any).mockResolvedValue(null);
      (passwordService.validate as any).mockReturnValue({
        valid: false,
        errors: ['Password too short'],
      });

      await expect(service.register(registerInput)).rejects.toThrow('Password too short');
    });

    it('should set GUEST/TRIAL members to ACTIVE immediately', async () => {
      const registerInput = {
        email: 'guest@example.com',
        password: 'SecurePass123!',
        firstName: 'Guest',
        lastName: 'User',
        membershipType: 'GUEST' as const,
      };

      (prisma.member.findUnique as any).mockResolvedValue(null);
      (passwordService.validate as any).mockReturnValue({ valid: true, errors: [] });
      (passwordService.hash as any).mockResolvedValue('hashed_password');
      (prisma.member.count as any).mockResolvedValue(0);
      (prisma.member.create as any).mockResolvedValue({
        id: '1',
        email: 'guest@example.com',
        firstName: 'Guest',
        lastName: 'User',
        membershipType: 'GUEST',
        membershipStatus: 'ACTIVE',
        membershipNumber: 'GCS-000001',
        role: 'MEMBER',
      });
      (jwtService.generateTokens as any).mockReturnValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });

      const result = await service.register(registerInput);

      expect(result.member.membershipStatus).toBe('ACTIVE');
    });
  });

  describe('login', () => {
    it('should successfully log in a member', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const mockMember = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        membershipType: 'FULL',
        membershipStatus: 'ACTIVE',
        role: 'MEMBER',
      };

      (prisma.member.findUnique as any).mockResolvedValue(mockMember);
      (passwordService.compare as any).mockResolvedValue(true);
      (prisma.member.update as any).mockResolvedValue(mockMember);
      (jwtService.generateTokens as any).mockReturnValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });

      const result = await service.login(loginInput);

      expect(result).toHaveProperty('member');
      expect(result).toHaveProperty('tokens');
      expect(prisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            lastLoginAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw error for non-existent user', async () => {
      const loginInput = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      (prisma.member.findUnique as any).mockResolvedValue(null);

      await expect(service.login(loginInput)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for incorrect password', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'wrong_password',
      };

      const mockMember = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
      };

      (prisma.member.findUnique as any).mockResolvedValue(mockMember);
      (passwordService.compare as any).mockResolvedValue(false);

      await expect(service.login(loginInput)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for inactive member', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'password',
      };

      const mockMember = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        membershipStatus: 'INACTIVE',
      };

      (prisma.member.findUnique as any).mockResolvedValue(mockMember);
      (passwordService.compare as any).mockResolvedValue(true);

      await expect(service.login(loginInput)).rejects.toThrow('Account is not active');
    });
  });
});
