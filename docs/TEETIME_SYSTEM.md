# Tee-Time Booking System

## Features

### Für Mitglieder:
- ✅ Verfügbare Tee-Times anzeigen (Kalenderansicht)
- ✅ Tee-Time buchen (Single, 2er, 3er, 4er Flight)
- ✅ Flight-Partner einladen
- ✅ Buchung stornieren (mit Deadline)
- ✅ Wiederkehrende Buchungen (z.B. "Jeden Sonntag 10:00")
- ✅ Warteliste bei ausgebuchten Zeiten

### Für Admins:
- ✅ Tee-Time-Slots konfigurieren (Intervalle, Kapazität)
- ✅ Sperrzeiten definieren (Turniere, Wartung)
- ✅ Priorisierung nach Mitgliedstyp
- ✅ Statistiken (Auslastung, No-Shows)

### Business Rules:
- Vollmitglieder: 7 Tage im Voraus
- Gäste/Trial: 3 Tage im Voraus
- No-Show Penalties (nach 3x Warnung)
- Weather-based Auto-Cancellation

## Prisma Schema Extension

```prisma
model TeeTimeSlot {
  id        String   @id @default(uuid())
  date      DateTime
  time      String   // "08:00", "08:10", etc.

  maxPlayers     Int      @default(4)
  currentPlayers Int      @default(0)

  status    TeeTimeStatus @default(AVAILABLE)
  isBlocked Boolean       @default(false)
  blockReason String?

  course    String   @default("main") // "main", "short", etc.
  holes     Int      @default(18)     // 9 or 18

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  bookings TeeTimeBooking[]

  @@unique([date, time, course])
  @@index([date, status])
}

enum TeeTimeStatus {
  AVAILABLE
  PARTIAL      // Some spots left
  FULL
  BLOCKED
  COMPLETED
}

model TeeTimeBooking {
  id String @id @default(uuid())

  slotId   String
  memberId String

  players    Int      @default(1)  // How many spots booked
  playerIds  String[] // IDs of flight partners

  status BookingStatus @default(CONFIRMED)

  bookedAt   DateTime @default(now())
  cancelledAt DateTime?

  isRecurring Boolean @default(false)
  recurringPattern Json? // { frequency: "weekly", dayOfWeek: 0 }

  notes String?

  slot   TeeTimeSlot @relation(fields: [slotId], references: [id], onDelete: Cascade)
  member Member      @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@index([slotId, status])
  @@index([memberId, bookedAt])
}

enum BookingStatus {
  CONFIRMED
  WAITLIST
  CANCELLED
  NO_SHOW
  COMPLETED
}

model TeeTimeConfiguration {
  id String @id @default(uuid())

  // Operating hours
  startTime String   @default("07:00")
  endTime   String   @default("20:00")
  interval  Int      @default(10) // minutes

  // Booking rules
  advanceBookingDays Json // { FULL: 7, GUEST: 3 }
  cancellationDeadlineHours Int @default(24)

  // Penalties
  noShowPenaltyDays Int @default(7) // Booking suspension

  isActive Boolean @default(true)

  updatedAt DateTime @updatedAt
}
```

## API Endpoints

```typescript
// Tee-Times abrufen
GET /api/v1/tee-times?date=2025-11-20&course=main

// Tee-Time buchen
POST /api/v1/tee-times/:slotId/book
{
  players: 2,
  playerIds: ["member-id-1"],
  notes: "Optional"
}

// Booking stornieren
DELETE /api/v1/tee-times/bookings/:bookingId

// Meine Buchungen
GET /api/v1/tee-times/bookings/me

// Admin: Slots erstellen/blockieren
POST /api/v1/tee-times/admin/generate
POST /api/v1/tee-times/admin/:slotId/block

// Statistiken
GET /api/v1/tee-times/statistics
```

## Implementation Priority

**Phase 1 (Critical):**
- Basic slot generation (daily)
- Single booking (1-4 players)
- View available times
- Cancel booking

**Phase 2 (Important):**
- Flight partner invites
- Recurring bookings
- Waitlist management
- No-show tracking

**Phase 3 (Nice-to-have):**
- QR-Code Check-in
- Weather-based recommendations
- AI-optimized slot suggestions
