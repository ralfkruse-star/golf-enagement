import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { MembershipType, MembershipStatus } from '@prisma/client';
import { logger } from '../../config/logger';

interface SegmentCriteria {
  membershipType?: MembershipType[];
  membershipStatus?: MembershipStatus[];
  ageRange?: [number, number]; // [min, max]
  handicapRange?: [number, number]; // [min, max]
  joinedAfter?: Date;
  joinedBefore?: Date;
  custom?: any; // For future extensions
}

interface CreateSegmentInput {
  name: string;
  description?: string;
  criteria: SegmentCriteria;
}

export class SegmentsService {
  /**
   * Create a new segment
   */
  async createSegment(input: CreateSegmentInput) {
    // Check if segment name already exists
    const existing = await prisma.segment.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new AppError(400, 'Segment with this name already exists');
    }

    const segment = await prisma.segment.create({
      data: {
        name: input.name,
        description: input.description,
        criteria: input.criteria as any,
        isSystem: false,
      },
    });

    // Calculate and assign members
    await this.recalculateSegment(segment.id);

    logger.info(`Segment created: ${segment.id} - ${segment.name}`);

    return segment;
  }

  /**
   * Update a segment
   */
  async updateSegment(segmentId: string, input: Partial<CreateSegmentInput>) {
    const segment = await prisma.segment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new AppError(404, 'Segment not found');
    }

    if (segment.isSystem) {
      throw new AppError(400, 'Cannot update system segments');
    }

    const updated = await prisma.segment.update({
      where: { id: segmentId },
      data: input,
    });

    // Recalculate members if criteria changed
    if (input.criteria) {
      await this.recalculateSegment(segmentId);
    }

    logger.info(`Segment updated: ${segmentId}`);

    return updated;
  }

  /**
   * Delete a segment
   */
  async deleteSegment(segmentId: string) {
    const segment = await prisma.segment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new AppError(404, 'Segment not found');
    }

    if (segment.isSystem) {
      throw new AppError(400, 'Cannot delete system segments');
    }

    await prisma.segment.delete({
      where: { id: segmentId },
    });

    logger.info(`Segment deleted: ${segmentId}`);

    return { message: 'Segment deleted successfully' };
  }

  /**
   * Get all segments
   */
  async getSegments() {
    const segments = await prisma.segment.findMany({
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return segments;
  }

  /**
   * Get segment by ID with members
   */
  async getSegmentById(segmentId: string) {
    const segment = await prisma.segment.findUnique({
      where: { id: segmentId },
      include: {
        members: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                membershipType: true,
                membershipStatus: true,
              },
            },
          },
        },
      },
    });

    if (!segment) {
      throw new AppError(404, 'Segment not found');
    }

    return segment;
  }

  /**
   * Recalculate segment membership based on criteria
   */
  async recalculateSegment(segmentId: string) {
    const segment = await prisma.segment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new AppError(404, 'Segment not found');
    }

    const criteria = segment.criteria as SegmentCriteria;

    // Build query based on criteria
    const where: any = {
      membershipStatus: 'ACTIVE', // Only active members
    };

    if (criteria.membershipType && criteria.membershipType.length > 0) {
      where.membershipType = { in: criteria.membershipType };
    }

    if (criteria.membershipStatus && criteria.membershipStatus.length > 0) {
      where.membershipStatus = { in: criteria.membershipStatus };
    }

    if (criteria.handicapRange) {
      where.handicap = {
        gte: criteria.handicapRange[0],
        lte: criteria.handicapRange[1],
      };
    }

    if (criteria.joinedAfter || criteria.joinedBefore) {
      where.joinDate = {};
      if (criteria.joinedAfter) where.joinDate.gte = criteria.joinedAfter;
      if (criteria.joinedBefore) where.joinDate.lte = criteria.joinedBefore;
    }

    // Age range (requires birthDate)
    if (criteria.ageRange) {
      const today = new Date();
      const maxBirthDate = new Date(today.getFullYear() - criteria.ageRange[0], today.getMonth(), today.getDate());
      const minBirthDate = new Date(today.getFullYear() - criteria.ageRange[1], today.getMonth(), today.getDate());

      where.birthDate = {
        gte: minBirthDate,
        lte: maxBirthDate,
      };
    }

    // Get matching members
    const members = await prisma.member.findMany({
      where,
      select: { id: true },
    });

    // Clear existing assignments
    await prisma.memberSegmentAssignment.deleteMany({
      where: { segmentId },
    });

    // Create new assignments
    if (members.length > 0) {
      await prisma.memberSegmentAssignment.createMany({
        data: members.map(m => ({
          memberId: m.id,
          segmentId,
        })),
      });
    }

    // Update member count
    await prisma.segment.update({
      where: { id: segmentId },
      data: { memberCount: members.length },
    });

    logger.info(`Segment ${segmentId} recalculated: ${members.length} members`);

    return { memberCount: members.length };
  }

  /**
   * Recalculate all segments (run periodically)
   */
  async recalculateAllSegments() {
    const segments = await prisma.segment.findMany({
      select: { id: true },
    });

    const results = [];

    for (const segment of segments) {
      try {
        const result = await this.recalculateSegment(segment.id);
        results.push({ segmentId: segment.id, ...result });
      } catch (error) {
        logger.error(`Failed to recalculate segment ${segment.id}:`, error);
      }
    }

    logger.info(`Recalculated ${results.length} segments`);

    return results;
  }

  /**
   * Get segments for a specific member
   */
  async getMemberSegments(memberId: string) {
    const assignments = await prisma.memberSegmentAssignment.findMany({
      where: { memberId },
      include: {
        segment: {
          select: {
            id: true,
            name: true,
            description: true,
            isSystem: true,
          },
        },
      },
    });

    return assignments.map(a => a.segment);
  }
}

export const segmentsService = new SegmentsService();
