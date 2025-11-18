# System-Architektur: Golf Engagement System

## Übersicht

Das Golf Engagement System ist eine moderne, cloud-native Anwendung für die digitale Mitgliederkommunikation im Golfclub Siek.

## Architektur-Prinzipien

1. **API-First**: Klare Trennung Backend/Frontend
2. **Mobile-First**: Native Apps als primäre User-Experience
3. **Real-time**: Sofortige Updates via WebSocket
4. **Skalierbar**: Unterstützt Wachstum von 1.000 auf 10.000+ Mitglieder
5. **GDPR-konform**: Datenschutz by Design
6. **Modular**: Lose gekoppelte Module

## System-Komponenten

### 1. Backend API (Node.js/TypeScript)

**Verantwortlichkeiten:**
- Business Logic
- Datenpersistenz
- Authentication & Authorization
- Push-Notification-Orchestrierung
- Real-time Event Broadcasting
- Integration mit externen Services

**Technologie:**
- Express.js (HTTP Server)
- Prisma ORM (Database)
- Socket.io (WebSocket)
- JWT (Authentication)
- FCM (Push Notifications)
- Bull (Job Queue für async Tasks)

**Module:**
```
src/
├── modules/
│   ├── auth/           # Login, Registration, Password Reset
│   ├── members/        # CRUD, Profil, Segmentierung
│   ├── events/         # Events, Registrations, Waitlists
│   ├── feed/           # Posts, Comments, Likes, Media
│   ├── notifications/  # Push, Email, SMS, Templates
│   ├── segments/       # Dynamic Segmentierung
│   ├── analytics/      # Stats, Reports, Dashboards
│   └── admin/          # Admin-spezifische Funktionen
├── shared/
│   ├── middleware/     # Auth, Logging, Error Handling
│   ├── services/       # Push, Email, Storage, Cache
│   └── utils/          # Helpers, Validators, Types
└── database/
    └── prisma/         # Schema, Migrations, Seed
```

### 2. PostgreSQL Database

**Schema Design:**

**Core Tables:**
- `members` - Mitgliederdaten
- `member_segments` - Dynamische Segmente
- `member_segment_assignments` - N:M Relation
- `events` - Golf-Events, Turniere, Trainings
- `event_registrations` - Anmeldungen + Wartelisten
- `feed_posts` - Social Feed Items
- `feed_comments` - Kommentare
- `feed_likes` - Likes/Reactions
- `notifications` - Benachrichtigungen (Archiv)
- `notification_templates` - Vorlagen
- `push_tokens` - FCM Device Tokens
- `media` - Bilder, Videos, Dokumente
- `audit_logs` - Change Tracking

**Indizes:**
- Member: email, membershipType, status
- Events: startDate, type, targetSegments
- Feed: createdAt, isPinned, authorId
- Notifications: recipientId, sentAt, type

### 3. Redis Cache/Queue

**Use Cases:**
- **Session Storage**: JWT Blacklist, Refresh Tokens
- **Cache**: Member Profiles, Segment Results, Event Lists
- **Rate Limiting**: API Request Throttling
- **Job Queue**: Async Push-Delivery, Email-Versand
- **Real-time**: Pub/Sub für WebSocket-Broadcasting

### 4. Frontend Web (Admin Dashboard)

**Verantwortlichkeiten:**
- Club-Administration
- Member Management
- Event Creation & Management
- Push-Notification Composer
- Analytics & Reports
- Content Management (Feed-Posts)

**Technologie:**
- React 18 + TypeScript
- Tailwind CSS
- Vite (Build Tool)
- React Query (API State)
- Zustand (Client State)
- React Hook Form + Zod (Forms/Validation)

**Seiten:**
```
/login
/dashboard                # Übersicht, KPIs
/members                  # Mitgliederverwaltung
/members/:id              # Mitglieder-Details
/segments                 # Segment-Builder
/events                   # Event-Management
/events/create            # Event erstellen
/events/:id               # Event-Details + Anmeldungen
/feed                     # Feed-Management
/feed/create              # Post erstellen
/notifications            # Push-Center
/notifications/create     # Push erstellen
/analytics                # Reports, Charts
/settings                 # Club-Einstellungen
```

### 5. Mobile App (React Native)

**Verantwortlichkeiten:**
- Mitglieder-Interface
- Push-Empfang
- Event-Anmeldung
- Feed-Konsum
- Profil-Verwaltung

**Technologie:**
- React Native + Expo
- TypeScript
- Expo Router (Navigation)
- React Query (API)
- Zustand (State)
- Expo Notifications (FCM)

**Screens:**
```
/                         # Home (Feed + Quick Actions)
/login                    # Login/Register
/profile                  # Mein Profil
/events                   # Event-Liste
/events/:id               # Event-Details
/feed                     # Social Feed
/feed/:id                 # Post-Details
/notifications            # Notification-History
/settings                 # App-Einstellungen
/course-status            # Platzstatus (Live)
```

## Datenfluss-Beispiele

### Beispiel 1: Push-Notification senden

```
1. Admin erstellt Notification im Dashboard
   POST /api/notifications
   {
     title: "Platz gesperrt wegen Nässe",
     body: "Der Platz ist bis 14 Uhr gesperrt",
     targetSegments: ["all-members"],
     scheduledAt: "2025-11-18T08:00:00Z"
   }

2. Backend speichert Notification in DB
   - Status: SCHEDULED

3. Bull Job Queue nimmt Job auf
   - Geplanter Versand: 08:00 Uhr

4. Job-Worker führt aus:
   - Lädt Segment-Mitglieder (1000 Members)
   - Lädt Push-Tokens (FCM)
   - Sendet in Batches (500 pro Request an FCM)
   - Aktualisiert Status: SENT

5. FCM liefert an Devices

6. Mobile App empfängt:
   - Zeigt System-Notification
   - Speichert in lokaler History
   - Badge-Count erhöhen

7. User tippt auf Notification:
   - App öffnet Details-Screen
   - Markiert als gelesen (PATCH /api/notifications/:id/read)
```

### Beispiel 2: Event-Anmeldung

```
1. User öffnet Event-Details in App
   GET /api/events/:id
   Response: { id, title, maxParticipants: 20, currentParticipants: 18, ... }

2. User klickt "Anmelden"
   POST /api/events/:id/register
   Body: { memberId: "..." }

3. Backend prüft:
   - Ist Event voll? Nein (18/20)
   - Ist Deadline erreicht? Nein
   - Ist User schon angemeldet? Nein

4. Backend:
   - Erstellt Registration (status: CONFIRMED)
   - Inkrementiert currentParticipants → 19
   - Sendet Bestätigungs-Push an User
   - Sendet Event an Socket.io (Real-time Update)

5. App aktualisiert UI (via WebSocket)
   - Zeigt "Angemeldet" Button
   - Aktualisiert Teilnehmerzahl: 19/20

6. Andere User sehen Update in Echtzeit
```

### Beispiel 3: Social Feed Post

```
1. Member postet Foto in App
   POST /api/feed/posts
   Body: {
     content: "Tolle Runde heute! ⛳",
     mediaUrls: ["https://storage.../photo.jpg"],
     type: "GENERAL"
   }

2. Backend:
   - Validiert Content
   - Speichert Post in DB
   - Broadcast via Socket.io an alle Online-User

3. Andere Members sehen Post sofort (WebSocket)
   oder beim nächsten Refresh (REST API)

4. Member liked Post:
   POST /api/feed/posts/:id/like

5. Backend:
   - Erstellt Like-Record
   - Inkrementiert likeCount
   - Sendet Push an Post-Author
   - Broadcast Update via Socket.io

6. Post-Author erhält Notification:
   "Max Mustermann gefällt dein Beitrag"
```

## Security

### Authentication
- **JWT Access Tokens** (15min TTL)
- **Refresh Tokens** (7 Tage TTL, stored in Redis)
- **Password Hashing**: bcrypt (10 rounds)

### Authorization
- **Role-Based Access Control (RBAC)**
  - SUPER_ADMIN: Voller Zugriff
  - ADMIN: Club-Management
  - MEMBER: Basis-Zugriff
  - GUEST: Limitierter Zugriff

### API Security
- **Rate Limiting**: 100 req/min pro IP
- **CORS**: Whitelisted Origins
- **Helmet.js**: Security Headers
- **Input Validation**: Zod Schemas
- **SQL Injection Prevention**: Prisma (Prepared Statements)
- **XSS Prevention**: Content Sanitization

### GDPR Compliance
- **Data Minimization**: Nur notwendige Daten
- **Right to Access**: Export-Funktion
- **Right to Deletion**: Anonymisierung statt Hard-Delete
- **Consent Management**: Opt-in für Notifications
- **Data Encryption**: At-rest & in-transit (TLS)
- **Audit Logs**: Alle Member-Data-Changes

## Skalierung

### Horizontale Skalierung
- **Backend**: Stateless → Multi-Instance hinter Load Balancer
- **Database**: Read Replicas für Analytics
- **Cache**: Redis Cluster
- **Media Storage**: CDN (CloudFlare, Cloudinary)

### Performance-Optimierung
- **API Caching**: Redis (Member Profiles, Segments, Events)
- **Database Indexing**: Optimierte Queries
- **Pagination**: Alle Listen (limit/offset)
- **Image Optimization**: Thumbnails, WebP, Lazy Loading
- **Code Splitting**: React Lazy Loading

### Monitoring
- **Application**: Logs (Winston), APM (Sentry)
- **Infrastructure**: Docker Stats, CPU/Memory
- **Database**: Query Performance, Connection Pool
- **Push Delivery**: FCM Success/Failure Rates

## Deployment

### Lokale Entwicklung
```bash
docker-compose up -d        # PostgreSQL + Redis
cd backend && pnpm dev      # Backend (Port 3000)
cd frontend-web && pnpm dev # Dashboard (Port 5173)
cd mobile && pnpm start     # Expo Dev Server
```

### Staging/Production
- **Backend**: Docker Container auf Cloud Run / Railway / Fly.io
- **Database**: Managed PostgreSQL (Supabase, Neon, Railway)
- **Redis**: Managed Redis (Upstash, Redis Cloud)
- **Frontend**: Vercel / Netlify
- **Mobile**: Expo EAS Build → App Store / Google Play

### CI/CD (GitHub Actions)
```
Push to main:
  1. Run Tests (Backend + Frontend)
  2. Build Docker Images
  3. Deploy Backend to Cloud Run
  4. Deploy Frontend to Vercel
  5. Trigger Expo Build (Mobile)
```

## Disaster Recovery

- **Database Backups**: Tägliche Snapshots (7 Tage Retention)
- **Point-in-Time Recovery**: PostgreSQL WAL
- **Rollback Strategy**: Git Tags + Docker Image Versions
- **Health Checks**: /health Endpoint (Backend)
- **Failover**: Automatisch via Load Balancer

## Kosten (Schätzung bei 1000 Mitgliedern)

| Service | Kosten/Monat |
|---------|--------------|
| Cloud Run (Backend) | ~$20 |
| PostgreSQL (Managed) | ~$25 |
| Redis (Managed) | ~$10 |
| Storage + CDN | ~$10 |
| FCM (Push) | Free (< 10M/month) |
| Frontend Hosting | Free (Vercel) |
| **Total** | **~$65/Monat** |

## Next Steps

1. ✅ Setup Backend Boilerplate
2. ✅ Datenmodell (Prisma Schema)
3. ✅ Auth Module (Login, Register, JWT)
4. ✅ Members Module (CRUD)
5. ✅ Push Notification Service
6. Frontend Dashboard Setup
7. Mobile App Setup
8. Integration Tests
9. Deployment Pipeline
