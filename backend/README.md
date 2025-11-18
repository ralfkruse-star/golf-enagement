# Golf Engagement Backend

Backend API für das Golf Engagement System des Golfclub Siek.

## Quick Start

### 1. Prerequisites

- Node.js 20+
- pnpm (oder npm/yarn)
- Docker & Docker Compose

### 2. Installation

```bash
# Install dependencies
pnpm install

# Start database (PostgreSQL + Redis)
docker-compose up -d

# Setup environment variables
cp .env.example .env
# Edit .env and add your API keys (FCM, Brevo, etc.)

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Seed database with test data
pnpm prisma:seed
```

### 3. Development

```bash
# Start development server (with auto-reload)
pnpm dev

# Server runs on http://localhost:3000
```

### 4. Database Management

```bash
# Open Prisma Studio (GUI for database)
pnpm prisma:studio

# Or use Adminer (web-based)
# http://localhost:8080
# Server: postgres
# Username: golf_user
# Password: golf_password
# Database: golf_engagement
```

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

**Register**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "Max",
  "lastName": "Mustermann",
  "membershipType": "FULL" // or "GUEST", "TRIAL", "JUNIOR", "SENIOR"
}

Response:
{
  "member": { ... },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Login**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "member": { ... },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Refresh Token**
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}

Response:
{
  "accessToken": "..."
}
```

### Members

**Get My Profile**
```http
GET /members/me
Authorization: Bearer <accessToken>

Response:
{
  "id": "...",
  "email": "...",
  "firstName": "...",
  ...
}
```

**Update My Profile**
```http
PATCH /members/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "firstName": "Max",
  "phone": "+49123456789",
  "handicap": 18.5
}
```

**Get All Members** (Admin only)
```http
GET /members?search=max&membershipType=FULL&limit=50&offset=0
Authorization: Bearer <accessToken>

Response:
{
  "members": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

## Test Accounts

After running `pnpm prisma:seed`:

| Email | Password | Role |
|-------|----------|------|
| admin@golfclub-siek.de | Admin123! | SUPER_ADMIN |
| max.mustermann@example.com | Test123! | MEMBER |
| anna.schmidt@example.com | Test123! | MEMBER |
| tom.neuling@example.com | Test123! | MEMBER (Trial) |

## Environment Variables

See `.env.example` for all available environment variables.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT signing (min 32 chars)

**Optional (but recommended):**
- `FCM_SERVER_KEY` - Firebase Cloud Messaging (for push notifications)
- `BREVO_API_KEY` - Brevo/Sendinblue (for email)

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Cache**: Redis
- **Auth**: JWT + bcrypt
- **Validation**: Zod
- **Logging**: Winston

## Project Structure

```
src/
├── config/          # Configuration (env, logger)
├── database/        # Prisma client, Redis
├── modules/
│   ├── auth/       # Authentication (login, register)
│   ├── members/    # Member management
│   ├── events/     # Events (coming soon)
│   ├── feed/       # Social feed (coming soon)
│   └── notifications/ # Push notifications (coming soon)
├── shared/
│   ├── middleware/ # Auth, error handling, validation
│   ├── services/   # Brevo, FCM, etc.
│   └── utils/      # JWT, password, helpers
└── index.ts        # Express app entry point
```

## Coming Soon

- 🔔 Push Notification System (FCM)
- 📅 Event Management API
- 📱 Social Feed API
- 🎯 Segmentation Engine
- 📊 Analytics & Reports
- 🏆 Gamification

## Support

For issues or questions, contact the development team.
