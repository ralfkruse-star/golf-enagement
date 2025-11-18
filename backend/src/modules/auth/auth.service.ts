import { prisma } from '../../database/prisma';
import { passwordService } from '../../shared/utils/password';
import { jwtService } from '../../shared/utils/jwt';
import { brevoService, emailTemplates } from '../../shared/services/brevo.service';
import { AppError } from '../../shared/middleware/error.middleware';
import { MembershipType, MembershipStatus, UserRole } from '@prisma/client';
import { logger } from '../../config/logger';

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  membershipType: MembershipType;
  birthDate?: Date;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Register a new member
   */
  async register(input: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.member.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError(400, 'Email already registered');
    }

    // Validate password
    const passwordValidation = passwordService.validate(input.password);
    if (!passwordValidation.valid) {
      throw new AppError(400, passwordValidation.errors.join(', '));
    }

    // Hash password
    const hashedPassword = await passwordService.hash(input.password);

    // Generate membership number (simple implementation)
    const memberCount = await prisma.member.count();
    const membershipNumber = `GCS-${(memberCount + 1).toString().padStart(6, '0')}`;

    // Determine initial status
    // GUEST and TRIAL can be active immediately, others might need approval
    const membershipStatus: MembershipStatus =
      input.membershipType === 'GUEST' || input.membershipType === 'TRIAL'
        ? 'ACTIVE'
        : 'PENDING';

    // Create member
    const member = await prisma.member.create({
      data: {
        email: input.email.toLowerCase(),
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        membershipType: input.membershipType,
        membershipStatus,
        membershipNumber,
        birthDate: input.birthDate,
        role: 'MEMBER',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        membershipType: true,
        membershipStatus: true,
        membershipNumber: true,
        role: true,
      },
    });

    // Sync to Brevo
    try {
      await brevoService.syncContact({
        email: member.email,
        attributes: {
          FIRSTNAME: member.firstName,
          LASTNAME: member.lastName,
          MEMBERSHIP_TYPE: member.membershipType,
          MEMBERSHIP_STATUS: member.membershipStatus,
        },
        listIds: member.membershipType === 'GUEST' || member.membershipType === 'TRIAL'
          ? [parseInt(process.env.BREVO_LIST_TRIAL || '0')]
          : [parseInt(process.env.BREVO_LIST_MEMBERS || '0')],
      });

      // Send welcome email
      const welcomeEmail = emailTemplates.welcome(member.firstName, member.membershipType);
      await brevoService.sendTransactionalEmail({
        to: [{ email: member.email, name: `${member.firstName} ${member.lastName}` }],
        subject: welcomeEmail.subject,
        htmlContent: welcomeEmail.htmlContent,
        tags: ['welcome', 'registration'],
      });
    } catch (error) {
      logger.error('Failed to sync with Brevo or send welcome email', error);
      // Don't fail registration if email fails
    }

    // Generate tokens
    const accessToken = jwtService.generateAccessToken(member.id, member.email, member.role);
    const refreshToken = jwtService.generateRefreshToken(member.id, member.email, member.role);

    logger.info(`New member registered: ${member.email} (${member.membershipType})`);

    return {
      member,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Login
   */
  async login(input: LoginInput) {
    // Find member
    const member = await prisma.member.findUnique({
      where: { email: input.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        membershipType: true,
        membershipStatus: true,
        role: true,
      },
    });

    if (!member) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Check password
    const isPasswordValid = await passwordService.compare(input.password, member.password);

    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Check if account is active
    if (member.membershipStatus === 'SUSPENDED') {
      throw new AppError(403, 'Account is suspended');
    }

    if (member.membershipStatus === 'INACTIVE') {
      throw new AppError(403, 'Account is inactive. Please contact support.');
    }

    // Update last login
    await prisma.member.update({
      where: { id: member.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = jwtService.generateAccessToken(member.id, member.email, member.role);
    const refreshToken = jwtService.generateRefreshToken(member.id, member.email, member.role);

    logger.info(`Member logged in: ${member.email}`);

    const { password, ...memberWithoutPassword } = member;

    return {
      member: memberWithoutPassword,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    const payload = jwtService.verifyToken(refreshToken);

    if (payload.type !== 'refresh') {
      throw new AppError(401, 'Invalid token type');
    }

    // Verify user still exists
    const member = await prisma.member.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        membershipStatus: true,
      },
    });

    if (!member || member.membershipStatus === 'SUSPENDED' || member.membershipStatus === 'INACTIVE') {
      throw new AppError(401, 'Invalid token');
    }

    // Generate new access token
    const newAccessToken = jwtService.generateAccessToken(member.id, member.email, member.role);

    return {
      accessToken: newAccessToken,
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const member = await prisma.member.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, firstName: true },
    });

    if (!member) {
      // Don't reveal if email exists
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwtService.generateAccessToken(member.id, member.email, 'MEMBER');

    // In production, store this in Redis with expiry
    // For now, we'll just generate it

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send password reset email
    try {
      const resetEmail = emailTemplates.passwordReset(member.firstName, resetLink);
      await brevoService.sendTransactionalEmail({
        to: [{ email: member.email, name: member.firstName }],
        subject: resetEmail.subject,
        htmlContent: resetEmail.htmlContent,
        tags: ['password-reset'],
      });
    } catch (error) {
      logger.error('Failed to send password reset email', error);
      throw new AppError(500, 'Failed to send reset email');
    }

    logger.info(`Password reset requested for: ${member.email}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    const payload = jwtService.verifyToken(token);

    // Validate new password
    const passwordValidation = passwordService.validate(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(400, passwordValidation.errors.join(', '));
    }

    // Hash new password
    const hashedPassword = await passwordService.hash(newPassword);

    // Update password
    await prisma.member.update({
      where: { id: payload.userId },
      data: { password: hashedPassword },
    });

    logger.info(`Password reset successful for member ID: ${payload.userId}`);

    return { message: 'Password reset successful' };
  }
}

export const authService = new AuthService();
