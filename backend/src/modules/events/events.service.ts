import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { EventType, EventStatus, RegistrationStatus } from '@prisma/client';
import { logger } from '../../config/logger';
import { queuePushNotification } from '../../shared/services/queue.service';
import { brevoService, emailTemplates } from '../../shared/services/brevo.service';

interface CreateEventInput {
  title: string;
  description?: string;
  type: EventType;
  startDate: Date;
  endDate?: Date;
  location?: string;
  maxParticipants?: number;
  registrationDeadline?: Date;
  requiresApproval?: boolean;
  isPublic?: boolean;
  imageUrl?: string;
  targetSegmentIds?: string[];
}

interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: EventStatus;
}

export class EventsService {
  /**
   * Create a new event
   */
  async createEvent(input: CreateEventInput, createdById: string) {
    const event = await prisma.event.create({
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        location: input.location,
        maxParticipants: input.maxParticipants,
        registrationDeadline: input.registrationDeadline,
        requiresApproval: input.requiresApproval || false,
        isPublic: input.isPublic ?? true,
        imageUrl: input.imageUrl,
        targetSegmentIds: input.targetSegmentIds || [],
        createdById,
        status: 'DRAFT',
      },
    });

    logger.info(`Event created: ${event.id} - ${event.title}`);

    return event;
  }

  /**
   * Update an event
   */
  async updateEvent(eventId: string, input: UpdateEventInput) {
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      throw new AppError(404, 'Event not found');
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: input,
    });

    logger.info(`Event updated: ${event.id} - ${event.title}`);

    return event;
  }

  /**
   * Publish an event (send notifications to target segments)
   */
  async publishEvent(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    if (event.status === 'PUBLISHED') {
      throw new AppError(400, 'Event already published');
    }

    // Update status
    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'PUBLISHED' },
    });

    // Get target members
    const targetMemberIds = await this.getTargetMembers(event.targetSegmentIds);

    if (targetMemberIds.length > 0) {
      // Send push notification about new event
      const notificationId = `event-${eventId}-${Date.now()}`;

      await queuePushNotification(
        notificationId,
        `Neues Event: ${event.title}`,
        event.description || `${event.type} am ${event.startDate.toLocaleDateString('de-DE')}`,
        targetMemberIds,
        {
          data: {
            eventId: event.id,
            type: 'event_published',
          },
          imageUrl: event.imageUrl || undefined,
          priority: 'HIGH',
        }
      );

      logger.info(`Event published: ${event.id} - Notifications sent to ${targetMemberIds.length} members`);
    }

    return event;
  }

  /**
   * Get all events with filters
   */
  async getEvents(filters?: {
    type?: EventType;
    status?: EventStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const { type, status, startDate, endDate, limit = 50, offset = 0 } = filters || {};

    const where: any = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = startDate;
      if (endDate) where.startDate.lte = endDate;
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startDate: 'asc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { registrations: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return {
      events,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get event by ID with registrations
   */
  async getEventById(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        registrations: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                membershipType: true,
              },
            },
          },
          orderBy: [
            { status: 'asc' },
            { waitlistPos: 'asc' },
            { registeredAt: 'asc' },
          ],
        },
      },
    });

    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    return event;
  }

  /**
   * Register a member for an event
   */
  async registerForEvent(eventId: string, memberId: string, comment?: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    if (event.status !== 'PUBLISHED') {
      throw new AppError(400, 'Event is not open for registration');
    }

    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      throw new AppError(400, 'Registration deadline has passed');
    }

    // Check if already registered
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_memberId: { eventId, memberId },
      },
    });

    if (existingRegistration) {
      throw new AppError(400, 'Already registered for this event');
    }

    // Check capacity
    const isFull = event.maxParticipants && event.currentParticipants >= event.maxParticipants;

    let status: RegistrationStatus = 'CONFIRMED';
    let waitlistPos: number | undefined;

    if (isFull && event.waitlistEnabled) {
      // Add to waitlist
      status = 'WAITLIST';
      const waitlistCount = await prisma.eventRegistration.count({
        where: { eventId, status: 'WAITLIST' },
      });
      waitlistPos = waitlistCount + 1;
    } else if (isFull) {
      throw new AppError(400, 'Event is full and waitlist is disabled');
    } else if (event.requiresApproval) {
      // Requires manual approval
      status = 'CONFIRMED'; // Will be approved by admin
    }

    // Create registration
    const registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        memberId,
        status,
        waitlistPos,
        comment,
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        event: true,
      },
    });

    // Update event participant count (only if confirmed)
    if (status === 'CONFIRMED') {
      await prisma.event.update({
        where: { id: eventId },
        data: { currentParticipants: { increment: 1 } },
      });
    }

    // Send confirmation email
    try {
      const confirmationEmail = emailTemplates.eventConfirmation(
        registration.member.firstName,
        event.title,
        event.startDate.toLocaleDateString('de-DE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );

      await brevoService.sendTransactionalEmail({
        to: [{ email: registration.member.email, name: registration.member.firstName }],
        subject: confirmationEmail.subject,
        htmlContent: confirmationEmail.htmlContent,
        tags: ['event-registration', eventId],
      });
    } catch (error) {
      logger.error('Failed to send event confirmation email:', error);
    }

    logger.info(`Member ${memberId} registered for event ${eventId} (${status})`);

    return registration;
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(eventId: string, memberId: string) {
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_memberId: { eventId, memberId },
      },
      include: { event: true },
    });

    if (!registration) {
      throw new AppError(404, 'Registration not found');
    }

    if (registration.status === 'CANCELLED') {
      throw new AppError(400, 'Registration already cancelled');
    }

    const wasConfirmed = registration.status === 'CONFIRMED';

    // Cancel registration
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // If was confirmed, decrement participant count and promote waitlist
    if (wasConfirmed) {
      await prisma.event.update({
        where: { id: eventId },
        data: { currentParticipants: { decrement: 1 } },
      });

      // Promote first person from waitlist
      await this.promoteFromWaitlist(eventId);
    }

    logger.info(`Registration cancelled: ${registration.id}`);

    return { message: 'Registration cancelled successfully' };
  }

  /**
   * Promote first person from waitlist
   */
  private async promoteFromWaitlist(eventId: string) {
    const firstWaitlisted = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        status: 'WAITLIST',
      },
      orderBy: { waitlistPos: 'asc' },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
        event: true,
      },
    });

    if (!firstWaitlisted) return;

    // Promote to confirmed
    await prisma.eventRegistration.update({
      where: { id: firstWaitlisted.id },
      data: {
        status: 'CONFIRMED',
        waitlistPos: null,
      },
    });

    await prisma.event.update({
      where: { id: eventId },
      data: { currentParticipants: { increment: 1 } },
    });

    // Send notification
    await queuePushNotification(
      `waitlist-promotion-${firstWaitlisted.id}`,
      'Platz frei geworden!',
      `Sie wurden für "${firstWaitlisted.event.title}" von der Warteliste aufgerückt.`,
      [firstWaitlisted.member.id],
      {
        data: {
          eventId,
          type: 'waitlist_promoted',
        },
        priority: 'HIGH',
      }
    );

    logger.info(`Promoted member ${firstWaitlisted.memberId} from waitlist for event ${eventId}`);
  }

  /**
   * Delete an event (only if no confirmed registrations)
   */
  async deleteEvent(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            registrations: {
              where: { status: 'CONFIRMED' },
            },
          },
        },
      },
    });

    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    if (event._count.registrations > 0) {
      throw new AppError(400, 'Cannot delete event with confirmed registrations');
    }

    await prisma.event.delete({
      where: { id: eventId },
    });

    logger.info(`Event deleted: ${eventId}`);

    return { message: 'Event deleted successfully' };
  }

  /**
   * Get target members for event segments
   */
  private async getTargetMembers(segmentIds: string[]): Promise<string[]> {
    if (!segmentIds || segmentIds.length === 0) {
      // No specific segments = all active members
      const members = await prisma.member.findMany({
        where: { membershipStatus: 'ACTIVE' },
        select: { id: true },
      });
      return members.map(m => m.id);
    }

    const assignments = await prisma.memberSegmentAssignment.findMany({
      where: { segmentId: { in: segmentIds } },
      select: { memberId: true },
      distinct: ['memberId'],
    });

    return assignments.map(a => a.memberId);
  }

  /**
   * Get event statistics
   */
  async getStatistics() {
    const [total, published, upcoming, completed] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: 'PUBLISHED' } }),
      prisma.event.count({
        where: {
          status: 'PUBLISHED',
          startDate: { gte: new Date() },
        },
      }),
      prisma.event.count({ where: { status: 'COMPLETED' } }),
    ]);

    const totalRegistrations = await prisma.eventRegistration.count({
      where: { status: 'CONFIRMED' },
    });

    return {
      total,
      published,
      upcoming,
      completed,
      totalRegistrations,
    };
  }
}

export const eventsService = new EventsService();
