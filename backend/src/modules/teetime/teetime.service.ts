import { PrismaClient, TeeTimeStatus, BookingStatus, MembershipType } from '@prisma/client';
import { addDays, format, parseISO, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

export class TeeTimeService {
  /**
   * Generate tee-time slots for a given date range
   */
  async generateSlots(params: {
    startDate: Date;
    endDate: Date;
    course?: string;
  }) {
    const { startDate, endDate, course = 'main' } = params;

    // Get configuration
    const config = await prisma.teeTimeConfiguration.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      throw new Error('No active tee-time configuration found');
    }

    const slots: any[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Generate time slots for this day
      const timeSlots = this.generateTimeSlotsForDay(
        config.startTime,
        config.endTime,
        config.interval
      );

      for (const time of timeSlots) {
        // Check if slot already exists
        const existing = await prisma.teeTimeSlot.findUnique({
          where: {
            date_time_course: {
              date: parseISO(dateStr),
              time,
              course,
            },
          },
        });

        if (!existing) {
          slots.push({
            date: parseISO(dateStr),
            time,
            course,
            maxPlayers: 4,
            currentPlayers: 0,
            status: TeeTimeStatus.AVAILABLE,
            isBlocked: false,
          });
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    // Batch create slots
    if (slots.length > 0) {
      await prisma.teeTimeSlot.createMany({
        data: slots,
        skipDuplicates: true,
      });
    }

    return { created: slots.length };
  }

  /**
   * Generate time slots for a single day
   */
  private generateTimeSlotsForDay(
    startTime: string,
    endTime: string,
    interval: number
  ): string[] {
    const slots: string[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      currentMinutes += interval;
    }

    return slots;
  }

  /**
   * Get available tee-times for a date
   */
  async getAvailableSlots(params: {
    date: string;
    course?: string;
  }) {
    const { date, course = 'main' } = params;

    const slots = await prisma.teeTimeSlot.findMany({
      where: {
        date: parseISO(date),
        course,
        isBlocked: false,
        OR: [
          { status: TeeTimeStatus.AVAILABLE },
          { status: TeeTimeStatus.PARTIAL },
        ],
      },
      include: {
        bookings: {
          where: {
            status: BookingStatus.CONFIRMED,
          },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { time: 'asc' },
    });

    return slots;
  }

  /**
   * Book a tee-time slot
   */
  async bookSlot(params: {
    slotId: string;
    memberId: string;
    players: number;
    playerIds?: string[];
    notes?: string;
  }) {
    const { slotId, memberId, players, playerIds = [], notes } = params;

    // Get member and slot
    const [member, slot] = await Promise.all([
      prisma.member.findUnique({ where: { id: memberId } }),
      prisma.teeTimeSlot.findUnique({
        where: { id: slotId },
        include: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
      }),
    ]);

    if (!member) throw new Error('Member not found');
    if (!slot) throw new Error('Tee-time slot not found');

    // Check if blocked
    if (slot.isBlocked) {
      throw new Error(`Slot is blocked: ${slot.blockReason}`);
    }

    // Check booking rules
    await this.validateBookingRules(member, slot);

    // Check capacity
    const currentPlayers = slot.bookings.reduce((sum, b) => sum + b.players, 0);
    const availableSpots = slot.maxPlayers - currentPlayers;

    if (players > availableSpots) {
      // Add to waitlist
      const booking = await prisma.teeTimeBooking.create({
        data: {
          slotId,
          memberId,
          players,
          playerIds,
          notes,
          status: BookingStatus.WAITLIST,
        },
        include: {
          slot: true,
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return { booking, status: 'waitlist' };
    }

    // Create confirmed booking
    const booking = await prisma.teeTimeBooking.create({
      data: {
        slotId,
        memberId,
        players,
        playerIds,
        notes,
        status: BookingStatus.CONFIRMED,
      },
      include: {
        slot: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Update slot status
    const newCurrentPlayers = currentPlayers + players;
    await prisma.teeTimeSlot.update({
      where: { id: slotId },
      data: {
        currentPlayers: newCurrentPlayers,
        status:
          newCurrentPlayers >= slot.maxPlayers
            ? TeeTimeStatus.FULL
            : TeeTimeStatus.PARTIAL,
      },
    });

    // TODO: Send confirmation notification

    return { booking, status: 'confirmed' };
  }

  /**
   * Validate booking rules (advance booking days)
   */
  private async validateBookingRules(member: any, slot: any) {
    const config = await prisma.teeTimeConfiguration.findFirst({
      where: { isActive: true },
    });

    if (!config) throw new Error('No active configuration');

    const advanceBookingDays = JSON.parse(
      config.advanceBookingDays as any
    ) as Record<string, number>;

    const maxDays =
      advanceBookingDays[member.membershipType] ||
      advanceBookingDays.GUEST ||
      3;

    const now = new Date();
    const slotDate = new Date(slot.date);
    const daysDiff = Math.ceil(
      (slotDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > maxDays) {
      throw new Error(
        `Your membership type allows booking only ${maxDays} days in advance`
      );
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(params: { bookingId: string; memberId: string }) {
    const { bookingId, memberId } = params;

    const booking = await prisma.teeTimeBooking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });

    if (!booking) throw new Error('Booking not found');
    if (booking.memberId !== memberId) {
      throw new Error('Unauthorized');
    }

    // Check cancellation deadline
    const config = await prisma.teeTimeConfiguration.findFirst({
      where: { isActive: true },
    });

    if (config) {
      const slotDateTime = new Date(
        `${format(booking.slot.date, 'yyyy-MM-dd')}T${booking.slot.time}`
      );
      const deadlineHours = config.cancellationDeadlineHours;
      const now = new Date();
      const hoursDiff =
        (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < deadlineHours) {
        throw new Error(
          `Cancellation deadline passed (${deadlineHours}h before tee-time)`
        );
      }
    }

    // Cancel booking
    await prisma.teeTimeBooking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    // Update slot status
    if (booking.status === BookingStatus.CONFIRMED) {
      const newCurrentPlayers = booking.slot.currentPlayers - booking.players;
      await prisma.teeTimeSlot.update({
        where: { id: booking.slotId },
        data: {
          currentPlayers: newCurrentPlayers,
          status:
            newCurrentPlayers === 0
              ? TeeTimeStatus.AVAILABLE
              : TeeTimeStatus.PARTIAL,
        },
      });

      // Process waitlist
      await this.processWaitlist(booking.slotId);
    }

    return { success: true };
  }

  /**
   * Process waitlist when spots become available
   */
  private async processWaitlist(slotId: string) {
    const slot = await prisma.teeTimeSlot.findUnique({
      where: { id: slotId },
      include: {
        bookings: {
          where: {
            OR: [
              { status: BookingStatus.CONFIRMED },
              { status: BookingStatus.WAITLIST },
            ],
          },
          orderBy: { bookedAt: 'asc' },
        },
      },
    });

    if (!slot) return;

    const confirmedPlayers = slot.bookings
      .filter((b) => b.status === BookingStatus.CONFIRMED)
      .reduce((sum, b) => sum + b.players, 0);

    const availableSpots = slot.maxPlayers - confirmedPlayers;

    if (availableSpots > 0) {
      const waitlistBookings = slot.bookings.filter(
        (b) => b.status === BookingStatus.WAITLIST
      );

      for (const booking of waitlistBookings) {
        if (booking.players <= availableSpots) {
          // Promote from waitlist
          await prisma.teeTimeBooking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.CONFIRMED },
          });

          await prisma.teeTimeSlot.update({
            where: { id: slotId },
            data: {
              currentPlayers: confirmedPlayers + booking.players,
              status:
                confirmedPlayers + booking.players >= slot.maxPlayers
                  ? TeeTimeStatus.FULL
                  : TeeTimeStatus.PARTIAL,
            },
          });

          // TODO: Send notification to member

          break;
        }
      }
    }
  }

  /**
   * Get member's bookings
   */
  async getMemberBookings(memberId: string, params?: {
    upcoming?: boolean;
  }) {
    const { upcoming = true } = params || {};

    const where: any = {
      memberId,
      status: {
        in: [BookingStatus.CONFIRMED, BookingStatus.WAITLIST],
      },
    };

    if (upcoming) {
      where.slot = {
        date: {
          gte: startOfDay(new Date()),
        },
      };
    }

    const bookings = await prisma.teeTimeBooking.findMany({
      where,
      include: {
        slot: true,
      },
      orderBy: {
        slot: {
          date: 'asc',
        },
      },
    });

    return bookings;
  }

  /**
   * Block a tee-time slot (admin)
   */
  async blockSlot(params: {
    slotId: string;
    reason: string;
  }) {
    const { slotId, reason } = params;

    const slot = await prisma.teeTimeSlot.update({
      where: { id: slotId },
      data: {
        isBlocked: true,
        blockReason: reason,
        status: TeeTimeStatus.BLOCKED,
      },
    });

    return slot;
  }

  /**
   * Unblock a tee-time slot (admin)
   */
  async unblockSlot(slotId: string) {
    const slot = await prisma.teeTimeSlot.findUnique({
      where: { id: slotId },
      include: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
    });

    if (!slot) throw new Error('Slot not found');

    const currentPlayers = slot.bookings.reduce((sum, b) => sum + b.players, 0);

    await prisma.teeTimeSlot.update({
      where: { id: slotId },
      data: {
        isBlocked: false,
        blockReason: null,
        status:
          currentPlayers === 0
            ? TeeTimeStatus.AVAILABLE
            : currentPlayers >= slot.maxPlayers
            ? TeeTimeStatus.FULL
            : TeeTimeStatus.PARTIAL,
      },
    });

    return { success: true };
  }

  /**
   * Get tee-time statistics
   */
  async getStatistics(params?: { startDate?: Date; endDate?: Date }) {
    const { startDate, endDate } = params || {};

    const where: any = {};
    if (startDate || endDate) {
      where.slot = {
        date: {},
      };
      if (startDate) where.slot.date.gte = startDate;
      if (endDate) where.slot.date.lte = endDate;
    }

    const [totalBookings, confirmedBookings, waitlistBookings, cancelledBookings, noShowBookings] = await Promise.all([
      prisma.teeTimeBooking.count({ where }),
      prisma.teeTimeBooking.count({
        where: { ...where, status: BookingStatus.CONFIRMED },
      }),
      prisma.teeTimeBooking.count({
        where: { ...where, status: BookingStatus.WAITLIST },
      }),
      prisma.teeTimeBooking.count({
        where: { ...where, status: BookingStatus.CANCELLED },
      }),
      prisma.teeTimeBooking.count({
        where: { ...where, status: BookingStatus.NO_SHOW },
      }),
    ]);

    return {
      totalBookings,
      confirmedBookings,
      waitlistBookings,
      cancelledBookings,
      noShowBookings,
      utilizationRate: totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0,
    };
  }
}

export const teeTimeService = new TeeTimeService();
