import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { MembershipType, MembershipStatus } from '@prisma/client';

export class MembersService {
  /**
   * Get all members with optional filters
   */
  async getMembers(filters?: {
    membershipType?: MembershipType;
    membershipStatus?: MembershipStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const {
      membershipType,
      membershipStatus,
      search,
      limit = 50,
      offset = 0,
    } = filters || {};

    const where: any = {};

    if (membershipType) {
      where.membershipType = membershipType;
    }

    if (membershipStatus) {
      where.membershipStatus = membershipStatus;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { membershipNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          membershipType: true,
          membershipStatus: true,
          membershipNumber: true,
          handicap: true,
          phone: true,
          joinDate: true,
          lastLoginAt: true,
          role: true,
        },
        orderBy: { lastName: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.member.count({ where }),
    ]);

    return {
      members,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get member by ID
   */
  async getMemberById(memberId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        membershipType: true,
        membershipStatus: true,
        membershipNumber: true,
        handicap: true,
        birthDate: true,
        gender: true,
        phone: true,
        address: true,
        city: true,
        zipCode: true,
        joinDate: true,
        lastLoginAt: true,
        emailVerified: true,
        notificationPreferences: true,
        language: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        segments: {
          select: {
            segment: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new AppError(404, 'Member not found');
    }

    return member;
  }

  /**
   * Update member profile
   */
  async updateMember(
    memberId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
      city?: string;
      zipCode?: string;
      handicap?: number;
      birthDate?: Date;
      gender?: string;
      notificationPreferences?: any;
      language?: string;
    }
  ) {
    const member = await prisma.member.update({
      where: { id: memberId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        zipCode: true,
        handicap: true,
        birthDate: true,
        gender: true,
        notificationPreferences: true,
        language: true,
        updatedAt: true,
      },
    });

    return member;
  }

  /**
   * Update member status (admin only)
   */
  async updateMemberStatus(memberId: string, status: MembershipStatus) {
    const member = await prisma.member.update({
      where: { id: memberId },
      data: { membershipStatus: status },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        membershipStatus: true,
      },
    });

    return member;
  }

  /**
   * Delete member (soft delete)
   */
  async deleteMember(memberId: string) {
    await prisma.member.update({
      where: { id: memberId },
      data: {
        deletedAt: new Date(),
        membershipStatus: 'INACTIVE',
      },
    });

    return { message: 'Member deleted successfully' };
  }

  /**
   * Get member statistics
   */
  async getStatistics() {
    const [
      total,
      active,
      byType,
      recentLogins,
    ] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { membershipStatus: 'ACTIVE' } }),
      prisma.member.groupBy({
        by: ['membershipType'],
        _count: true,
      }),
      prisma.member.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    return {
      total,
      active,
      byType: byType.reduce((acc, item) => {
        acc[item.membershipType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recentLogins,
    };
  }
}

export const membersService = new MembersService();
