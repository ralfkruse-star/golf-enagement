import { PrismaClient, MembershipType, MembershipStatus } from '@prisma/client';
import mysql from 'mysql2/promise';
import { env } from '../../config/env';
import { logger } from '../../shared/services/logger.service';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface PCCaddieConfig {
  host: string;
  database: string;
  user: string;
  password: string;
  port?: number;
}

export class PCCaddieSync {
  private mysqlConnection: mysql.Connection | null = null;
  private config: PCCaddieConfig;

  constructor(config: PCCaddieConfig) {
    this.config = config;
  }

  /**
   * Connect to PC Caddie MySQL database
   */
  async connect() {
    try {
      this.mysqlConnection = await mysql.createConnection({
        host: this.config.host,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        port: this.config.port || 3306,
      });

      logger.info('✅ Connected to PC Caddie database');
    } catch (error) {
      logger.error('❌ Failed to connect to PC Caddie database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from PC Caddie database
   */
  async disconnect() {
    if (this.mysqlConnection) {
      await this.mysqlConnection.end();
      logger.info('Disconnected from PC Caddie database');
    }
  }

  /**
   * Sync all data from PC Caddie
   */
  async syncAll() {
    try {
      await this.connect();

      logger.info('🔄 Starting PC Caddie full sync...');

      await this.syncMembers();
      await this.syncTournaments();
      await this.syncHandicaps();

      logger.info('✅ PC Caddie full sync completed');
    } catch (error) {
      logger.error('❌ PC Caddie sync failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Sync members from PC Caddie
   */
  async syncMembers() {
    if (!this.mysqlConnection) {
      throw new Error('Not connected to PC Caddie database');
    }

    logger.info('Syncing members from PC Caddie...');

    try {
      // Fetch members from PC Caddie
      // Note: Column names may vary depending on PC Caddie version
      const [rows] = await this.mysqlConnection.query(`
        SELECT
          Mitgliedsnummer as memberNumber,
          Vorname as firstName,
          Nachname as lastName,
          Email as email,
          Handicap as handicap,
          Geburtsdatum as birthDate,
          Geschlecht as gender,
          Telefon as phone,
          Strasse as address,
          PLZ as zipCode,
          Ort as city,
          MitgliedsTyp as type,
          Status as status,
          Eintrittsdatum as joinDate
        FROM Mitglieder
        WHERE Status = 'aktiv' OR Status = 'ACTIVE'
      `);

      const members = rows as any[];
      let syncedCount = 0;
      let createdCount = 0;
      let updatedCount = 0;

      for (const member of members) {
        try {
          // Skip members without email
          if (!member.email) {
            logger.warn(`Skipping member ${member.memberNumber}: No email address`);
            continue;
          }

          const membershipType = this.mapMembershipType(member.type);

          // Check if member exists
          const existing = await prisma.member.findUnique({
            where: { membershipNumber: member.memberNumber },
          });

          if (existing) {
            // Update existing member
            await prisma.member.update({
              where: { membershipNumber: member.memberNumber },
              data: {
                firstName: member.firstName || existing.firstName,
                lastName: member.lastName || existing.lastName,
                email: member.email || existing.email,
                handicap: member.handicap !== null ? parseFloat(member.handicap) : existing.handicap,
                birthDate: member.birthDate ? new Date(member.birthDate) : existing.birthDate,
                gender: member.gender || existing.gender,
                phone: member.phone || existing.phone,
                address: member.address || existing.address,
                city: member.city || existing.city,
                zipCode: member.zipCode || existing.zipCode,
                membershipType,
                membershipStatus: MembershipStatus.ACTIVE,
              },
            });
            updatedCount++;
          } else {
            // Create new member
            const tempPassword = await this.generateTempPassword();

            await prisma.member.create({
              data: {
                membershipNumber: member.memberNumber,
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                password: tempPassword,
                handicap: member.handicap ? parseFloat(member.handicap) : null,
                birthDate: member.birthDate ? new Date(member.birthDate) : null,
                gender: member.gender,
                phone: member.phone,
                address: member.address,
                city: member.city,
                zipCode: member.zipCode,
                membershipType,
                membershipStatus: MembershipStatus.ACTIVE,
                joinDate: member.joinDate ? new Date(member.joinDate) : new Date(),
                role: 'MEMBER',
              },
            });
            createdCount++;
          }

          syncedCount++;
        } catch (error: any) {
          logger.error(`Failed to sync member ${member.memberNumber}:`, error.message);
        }
      }

      logger.info(`✅ Synced ${syncedCount} members (${createdCount} created, ${updatedCount} updated)`);
    } catch (error) {
      logger.error('Failed to sync members:', error);
      throw error;
    }
  }

  /**
   * Sync tournaments/events from PC Caddie
   */
  async syncTournaments() {
    if (!this.mysqlConnection) {
      throw new Error('Not connected to PC Caddie database');
    }

    logger.info('Syncing tournaments from PC Caddie...');

    try {
      // Fetch upcoming tournaments
      const [rows] = await this.mysqlConnection.query(`
        SELECT
          TurnierID as id,
          Name as name,
          Datum as date,
          Beschreibung as description,
          MaxTeilnehmer as maxParticipants,
          Spielform as gameMode,
          Status as status
        FROM Turniere
        WHERE Datum >= CURDATE()
        ORDER BY Datum ASC
      `);

      const tournaments = rows as any[];
      let syncedCount = 0;

      for (const tournament of tournaments) {
        try {
          const externalId = `pccaddie-${tournament.id}`;

          // Check if event exists
          const existing = await prisma.event.findFirst({
            where: {
              title: tournament.name,
              startDate: new Date(tournament.date),
            },
          });

          const eventData = {
            title: tournament.name,
            description: tournament.description || `Tournament from PC Caddie`,
            type: 'TOURNAMENT' as any,
            startDate: new Date(tournament.date),
            maxParticipants: tournament.maxParticipants || null,
            status: tournament.status === 'published' ? 'PUBLISHED' : 'DRAFT',
            isPublic: true,
          };

          if (existing) {
            // Update existing event
            await prisma.event.update({
              where: { id: existing.id },
              data: eventData,
            });
          } else {
            // Create new event
            await prisma.event.create({
              data: eventData,
            });
          }

          syncedCount++;
        } catch (error: any) {
          logger.error(`Failed to sync tournament ${tournament.id}:`, error.message);
        }
      }

      logger.info(`✅ Synced ${syncedCount} tournaments`);
    } catch (error) {
      logger.error('Failed to sync tournaments:', error);
      throw error;
    }
  }

  /**
   * Sync handicaps from PC Caddie
   */
  async syncHandicaps() {
    if (!this.mysqlConnection) {
      throw new Error('Not connected to PC Caddie database');
    }

    logger.info('Syncing handicaps from PC Caddie...');

    try {
      // Fetch latest handicaps for all members
      const [rows] = await this.mysqlConnection.query(`
        SELECT
          h.Mitgliedsnummer as memberNumber,
          h.Handicap as handicap,
          h.Datum as date
        FROM HandicapHistory h
        INNER JOIN (
          SELECT Mitgliedsnummer, MAX(Datum) as MaxDate
          FROM HandicapHistory
          GROUP BY Mitgliedsnummer
        ) hm ON h.Mitgliedsnummer = hm.Mitgliedsnummer AND h.Datum = hm.MaxDate
      `);

      const handicaps = rows as any[];
      let syncedCount = 0;

      for (const hcp of handicaps) {
        try {
          // Find member
          const member = await prisma.member.findUnique({
            where: { membershipNumber: hcp.memberNumber },
          });

          if (!member) {
            logger.warn(`Member ${hcp.memberNumber} not found, skipping handicap sync`);
            continue;
          }

          const handicapValue = parseFloat(hcp.handicap);

          // Update member's current handicap
          await prisma.member.update({
            where: { id: member.id },
            data: { handicap: handicapValue },
          });

          // Create handicap history entry
          await prisma.handicapHistory.create({
            data: {
              memberId: member.id,
              handicap: handicapValue,
              date: new Date(hcp.date),
              reason: 'Synced from PC Caddie',
            },
          });

          syncedCount++;
        } catch (error: any) {
          logger.error(`Failed to sync handicap for member ${hcp.memberNumber}:`, error.message);
        }
      }

      logger.info(`✅ Synced ${syncedCount} handicaps`);
    } catch (error) {
      logger.error('Failed to sync handicaps:', error);
      throw error;
    }
  }

  /**
   * Map PC Caddie membership type to system type
   */
  private mapMembershipType(pcCaddieType: string): MembershipType {
    const mapping: Record<string, MembershipType> = {
      'Vollmitglied': MembershipType.FULL,
      'Vollmitgliedschaft': MembershipType.FULL,
      'FULL': MembershipType.FULL,
      'Seniorenmitglied': MembershipType.SENIOR,
      'Senior': MembershipType.SENIOR,
      'SENIOR': MembershipType.SENIOR,
      'Jugendmitglied': MembershipType.JUNIOR,
      'Jugend': MembershipType.JUNIOR,
      'JUNIOR': MembershipType.JUNIOR,
      'Gastmitglied': MembershipType.GUEST,
      'Gast': MembershipType.GUEST,
      'GUEST': MembershipType.GUEST,
      'Ehrenmitglied': MembershipType.HONORARY,
      'HONORARY': MembershipType.HONORARY,
      'Probe': MembershipType.TRIAL,
      'Schnupper': MembershipType.TRIAL,
      'TRIAL': MembershipType.TRIAL,
    };

    return mapping[pcCaddieType] || MembershipType.FULL;
  }

  /**
   * Generate temporary password for new members
   */
  private async generateTempPassword(): Promise<string> {
    // Generate random 10-character password
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // TODO: Send email to member with temp password
    logger.info(`Generated temporary password for new member (should be sent via email)`);

    return hashedPassword;
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    const [memberCount, eventCount, handicapCount] = await Promise.all([
      prisma.member.count(),
      prisma.event.count({ where: { type: 'TOURNAMENT' } }),
      prisma.handicapHistory.count(),
    ]);

    return {
      totalMembers: memberCount,
      totalTournaments: eventCount,
      totalHandicapEntries: handicapCount,
    };
  }
}

/**
 * Create PC Caddie sync instance from environment
 */
export function createPCCaddieSync(): PCCaddieSync {
  const config: PCCaddieConfig = {
    host: process.env.PC_CADDIE_HOST || 'localhost',
    database: process.env.PC_CADDIE_DATABASE || 'pccaddie',
    user: process.env.PC_CADDIE_USER || 'root',
    password: process.env.PC_CADDIE_PASSWORD || '',
    port: process.env.PC_CADDIE_PORT ? parseInt(process.env.PC_CADDIE_PORT) : 3306,
  };

  return new PCCaddieSync(config);
}

export const pcCaddieSync = createPCCaddieSync();
