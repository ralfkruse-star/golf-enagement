import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { logger } from '../../shared/services/logger.service';

const prisma = new PrismaClient();

interface QRCheckInData {
  type: 'event' | 'teetime';
  resourceId: string;
  memberId: string;
  timestamp: number;
  signature: string;
}

export class QRCheckInService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.QR_SECRET_KEY || 'default-qr-secret-key-change-in-production';
  }

  /**
   * Generate QR code for event registration
   */
  async generateEventQRCode(params: {
    eventId: string;
    memberId: string;
  }): Promise<string> {
    const { eventId, memberId } = params;

    // Verify event registration exists
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        memberId,
        status: 'CONFIRMED',
      },
    });

    if (!registration) {
      throw new Error('No confirmed registration found for this event');
    }

    const data: QRCheckInData = {
      type: 'event',
      resourceId: eventId,
      memberId,
      timestamp: Date.now(),
      signature: '',
    };

    // Create signature
    data.signature = this.createSignature(data);

    // Encode data as JSON
    const payload = JSON.stringify(data);

    // Generate QR code as Data URL
    const qrCode = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      width: 400,
    });

    return qrCode;
  }

  /**
   * Generate QR code for tee-time booking
   */
  async generateTeeTimeQRCode(params: {
    bookingId: string;
    memberId: string;
  }): Promise<string> {
    const { bookingId, memberId } = params;

    // Verify booking exists
    const booking = await prisma.teeTimeBooking.findFirst({
      where: {
        id: bookingId,
        memberId,
        status: 'CONFIRMED',
      },
    });

    if (!booking) {
      throw new Error('No confirmed booking found');
    }

    const data: QRCheckInData = {
      type: 'teetime',
      resourceId: bookingId,
      memberId,
      timestamp: Date.now(),
      signature: '',
    };

    // Create signature
    data.signature = this.createSignature(data);

    // Encode data as JSON
    const payload = JSON.stringify(data);

    // Generate QR code as Data URL
    const qrCode = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      width: 400,
    });

    return qrCode;
  }

  /**
   * Verify and process QR code check-in
   */
  async processCheckIn(qrData: string): Promise<{
    success: boolean;
    type: string;
    memberName: string;
    resourceName: string;
    timestamp: Date;
  }> {
    try {
      // Parse QR data
      const data: QRCheckInData = JSON.parse(qrData);

      // Verify signature
      if (!this.verifySignature(data)) {
        throw new Error('Invalid QR code signature');
      }

      // Check if QR code is not too old (24 hours)
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (now - data.timestamp > maxAge) {
        throw new Error('QR code has expired');
      }

      // Process based on type
      if (data.type === 'event') {
        return await this.processEventCheckIn(data);
      } else if (data.type === 'teetime') {
        return await this.processTeeTimeCheckIn(data);
      } else {
        throw new Error('Invalid QR code type');
      }
    } catch (error: any) {
      logger.error('QR check-in error:', error);
      throw error;
    }
  }

  /**
   * Process event check-in
   */
  private async processEventCheckIn(data: QRCheckInData) {
    const { resourceId: eventId, memberId } = data;

    // Get registration
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        memberId,
        status: 'CONFIRMED',
      },
      include: {
        event: true,
        member: true,
      },
    });

    if (!registration) {
      throw new Error('Registration not found or not confirmed');
    }

    // Check if event is today
    const eventDate = new Date(registration.event.startDate);
    const today = new Date();
    const isSameDay =
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear();

    if (!isSameDay) {
      throw new Error('This event is not today');
    }

    // TODO: Mark attendance (could add an attendance tracking table)
    logger.info(`Event check-in: ${registration.member.firstName} ${registration.member.lastName} → ${registration.event.title}`);

    return {
      success: true,
      type: 'event',
      memberName: `${registration.member.firstName} ${registration.member.lastName}`,
      resourceName: registration.event.title,
      timestamp: new Date(),
    };
  }

  /**
   * Process tee-time check-in
   */
  private async processTeeTimeCheckIn(data: QRCheckInData) {
    const { resourceId: bookingId, memberId } = data;

    // Get booking
    const booking = await prisma.teeTimeBooking.findFirst({
      where: {
        id: bookingId,
        memberId,
        status: 'CONFIRMED',
      },
      include: {
        slot: true,
        member: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found or not confirmed');
    }

    // Check if tee-time is today
    const slotDate = new Date(booking.slot.date);
    const today = new Date();
    const isSameDay =
      slotDate.getDate() === today.getDate() &&
      slotDate.getMonth() === today.getMonth() &&
      slotDate.getFullYear() === today.getFullYear();

    if (!isSameDay) {
      throw new Error('This tee-time is not today');
    }

    // Update booking status to completed
    await prisma.teeTimeBooking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED' },
    });

    logger.info(`Tee-time check-in: ${booking.member.firstName} ${booking.member.lastName} → ${booking.slot.time}`);

    return {
      success: true,
      type: 'teetime',
      memberName: `${booking.member.firstName} ${booking.member.lastName}`,
      resourceName: `Tee-Time ${booking.slot.time}`,
      timestamp: new Date(),
    };
  }

  /**
   * Create HMAC signature for QR data
   */
  private createSignature(data: QRCheckInData): string {
    const payload = `${data.type}:${data.resourceId}:${data.memberId}:${data.timestamp}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  private verifySignature(data: QRCheckInData): boolean {
    const expectedSignature = this.createSignature(data);
    return crypto.timingSafeEqual(
      Buffer.from(data.signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get QR code for member's next event
   */
  async getMyNextEventQR(memberId: string) {
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        memberId,
        status: 'CONFIRMED',
        event: {
          startDate: {
            gte: new Date(),
          },
        },
      },
      include: {
        event: true,
      },
      orderBy: {
        event: {
          startDate: 'asc',
        },
      },
    });

    if (!registration) {
      throw new Error('No upcoming events found');
    }

    const qrCode = await this.generateEventQRCode({
      eventId: registration.eventId,
      memberId,
    });

    return {
      qrCode,
      event: registration.event,
    };
  }

  /**
   * Get QR code for member's next tee-time
   */
  async getMyNextTeeTimeQR(memberId: string) {
    const booking = await prisma.teeTimeBooking.findFirst({
      where: {
        memberId,
        status: 'CONFIRMED',
        slot: {
          date: {
            gte: new Date(),
          },
        },
      },
      include: {
        slot: true,
      },
      orderBy: {
        slot: {
          date: 'asc',
        },
      },
    });

    if (!booking) {
      throw new Error('No upcoming tee-times found');
    }

    const qrCode = await this.generateTeeTimeQRCode({
      bookingId: booking.id,
      memberId,
    });

    return {
      qrCode,
      booking,
      slot: booking.slot,
    };
  }
}

export const qrCheckInService = new QRCheckInService();
