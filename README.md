# Golf Engagement System - Golfclub Siek

Modernes digitales Mitgliederkommunikationssystem für den Golfclub Siek mit ~1000 Mitgliedern.

## Features

- ✅ Push-Benachrichtigungen (Platzstatus, Events, Änderungen)
- ✅ Mitgliederverwaltung & Segmentierung
- ✅ Event-Management & Anmeldungen
- ✅ Social Feed / Schwarzes Brett
- ✅ Admin-Dashboard für Clubmanagement
- ✅ Native iOS & Android Apps
- ✅ Web-Interface (React + Tailwind)

## Architektur

```
┌─────────────────────────────────────────────────┐
│           Mobile Apps (iOS/Android)              │
│              React Native + Expo                 │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│          Admin Dashboard (Web)                   │
│           React + Tailwind CSS                   │
└─────────────────┬───────────────────────────────┘
                  │
                  │ REST API / WebSocket
                  │
┌─────────────────▼───────────────────────────────┐
│              Backend API                         │
│        Node.js + TypeScript + Express            │
│  ┌──────────────────────────────────────────┐   │
│  │ Auth │ Members │ Events │ Feed │ Push    │   │
│  └──────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌───────────────┐    ┌──────────────┐
│  PostgreSQL   │    │    Redis     │
│   Database    │    │    Cache     │
└───────────────┘    └──────────────┘
```

## Technologie-Stack

### Backend
- **Runtime**: Node.js 20.x
- **Language**: TypeScript 5.x
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **Cache**: Redis 7.x
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Push Notifications**: Firebase Cloud Messaging
- **Real-time**: Socket.io

### Frontend Web (Admin Dashboard)
- **Framework**: React 18
- **Styling**: Tailwind CSS 3.x
- **State Management**: Zustand / React Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Build Tool**: Vite

### Mobile Apps
- **Framework**: React Native + Expo
- **Navigation**: React Navigation
- **State**: Zustand / React Query
- **UI**: React Native Paper / Custom Components
- **Push**: Expo Push Notifications (FCM)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Hosting**: TBD (Cloud Run, Railway, Heroku, VPS)

## Projekt-Struktur

```
golf-engagement/
├── backend/              # Node.js/TypeScript Backend API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── members/
│   │   │   ├── events/
│   │   │   ├── feed/
│   │   │   ├── notifications/
│   │   │   └── segments/
│   │   ├── database/
│   │   ├── services/
│   │   └── utils/
│   ├── prisma/
│   └── tests/
├── frontend-web/         # React Admin Dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── store/
│   └── public/
├── mobile/               # React Native App
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── services/
│   │   └── store/
│   └── assets/
├── shared/               # Shared types, utils
│   ├── types/
│   └── utils/
├── infrastructure/       # Docker, CI/CD
│   ├── docker/
│   └── github-actions/
└── docs/                 # Documentation
    ├── api/
    ├── architecture/
    └── deployment/
```

## Quick Start (Lokale Entwicklung)

### Prerequisites
- Node.js 20.x
- Docker & Docker Compose
- pnpm (oder npm/yarn)

### Setup

1. **Clone & Install**
```bash
git clone <repo-url>
cd golf-engagement
pnpm install
```

2. **Start Database (Docker)**
```bash
docker-compose up -d
```

3. **Backend Setup**
```bash
cd backend
cp .env.example .env
pnpm prisma migrate dev
pnpm dev
```

4. **Frontend Web**
```bash
cd frontend-web
pnpm dev
```

5. **Mobile App**
```bash
cd mobile
pnpm start
```

## Datenmodell (Core Entities)

### Member
- id, email, firstName, lastName
- membershipType (FULL, JUNIOR, SENIOR, GUEST)
- membershipStatus (ACTIVE, INACTIVE, SUSPENDED)
- handicap, birthDate, joinDate
- preferences (notifications, language)
- segments (array of segment IDs)

### Event
- id, title, description, type
- startDate, endDate, location
- maxParticipants, currentParticipants
- registrationDeadline
- isPublic, requiresApproval
- targetSegments

### Notification
- id, title, body, type
- recipientSegments, recipientIds
- scheduledAt, sentAt
- priority, expiresAt
- deliveryStatus

### Feed Post
- id, authorId, content, mediaUrls
- type (ANNOUNCEMENT, EVENT, ACHIEVEMENT, GENERAL)
- isPinned, isPublished
- likes, comments
- targetSegments

### Segment
- id, name, description
- criteria (JSON: membershipType, ageRange, handicapRange, custom)
- memberCount

## Roadmap

### Phase 1: MVP (Woche 1-4)
- ✅ Backend Core (Auth, Members, Basic API)
- ✅ Admin Dashboard (Member Management)
- ✅ Mobile App (Login, Profile, Notifications)
- ✅ Push Notifications
- ✅ Basic Event Management

### Phase 2: Engagement (Woche 5-8)
- Social Feed / Schwarzes Brett
- Event Registrations & Waitlists
- Advanced Segmentation
- Rich Notifications (Images, Actions)
- Real-time Updates

### Phase 3: Advanced (Woche 9-12)
- Analytics & Reports
- Gamification (Achievements, Leaderboards)
- Tee-Time Integration
- Weather & Course Status
- AI-Personalisierung

## Deployment

TBD - Optionen:
- Google Cloud Run (Backend)
- Vercel/Netlify (Frontend)
- App Store & Google Play (Mobile)

## License

Proprietary - Golfclub Siek

## Support

Entwickler: [Your Name]
Kontakt: [Your Email]
