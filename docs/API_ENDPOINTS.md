# Golf Engagement System - API Endpoints

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication

### POST /auth/register
Register new member
- **Body:** `{ email, password, firstName, lastName, membershipType }`
- **Response:** `{ token, user }`

### POST /auth/login
Login
- **Body:** `{ email, password }`
- **Response:** `{ token, user }`

### POST /auth/refresh
Refresh token
- **Body:** `{ refreshToken }`
- **Response:** `{ token }`

---

## 👥 Members

### GET /members
Get all members (Admin)
- **Query:** `limit, offset, search, membershipType`

### GET /members/me
Get current member profile

### PATCH /members/me
Update current member profile
- **Body:** `{ firstName, lastName, phone, ... }`

### GET /members/:id
Get member by ID (Admin)

### DELETE /members/:id
Delete member (Admin)

---

## 📅 Events

### GET /events
Get all events
- **Query:** `limit, offset, type, status, upcoming`

### POST /events
Create event (Admin)
- **Body:** `{ title, description, type, startDate, maxParticipants, ... }`

### GET /events/:id
Get event by ID

### PATCH /events/:id
Update event (Admin)

### DELETE /events/:id
Delete event (Admin)

### POST /events/:id/register
Register for event
- **Body:** `{ comment? }`

### DELETE /events/:id/register
Cancel event registration

### GET /events/:id/registrations
Get event registrations (Admin)

---

## 📢 Notifications

### GET /notifications
Get all notifications (Admin)

### POST /notifications
Create and send notification (Admin)
- **Body:** `{ title, body, type, recipientSegmentIds, scheduledAt?, ... }`

### GET /notifications/me
Get my notifications

### POST /push-tokens
Register push token
- **Body:** `{ token, platform }`

---

## 📰 Feed

### GET /feed
Get feed posts
- **Query:** `limit, offset`

### POST /feed
Create post (Admin)
- **Body:** `{ content, type, targetSegmentIds, mediaUrls?, ... }`

### GET /feed/:id
Get post by ID

### PATCH /feed/:id
Update post (Admin)

### DELETE /feed/:id
Delete post (Admin/Author)

### POST /feed/:id/like
Like post

### DELETE /feed/:id/like
Unlike post

### POST /feed/:id/comments
Add comment
- **Body:** `{ content }`

### DELETE /feed/comments/:commentId
Delete comment (Admin/Author)

---

## 🎯 Segments

### GET /segments
Get all segments (Admin)

### POST /segments
Create segment (Admin)
- **Body:** `{ name, description, criteria }`

### GET /segments/:id
Get segment by ID (Admin)

### PATCH /segments/:id
Update segment (Admin)

### DELETE /segments/:id
Delete segment (Admin)

### POST /segments/:id/assign
Assign members to segment (Admin)
- **Body:** `{ memberIds }`

---

## ⛳ Tee-Times

### GET /tee-times
Get available tee-time slots
- **Query:** `date, course`

### POST /tee-times/:slotId/book
Book tee-time slot
- **Body:** `{ players, playerIds?, notes? }`

### DELETE /tee-times/bookings/:bookingId
Cancel tee-time booking

### GET /tee-times/bookings/me
Get my tee-time bookings
- **Query:** `upcoming`

### POST /tee-times/admin/generate
Generate tee-time slots (Admin)
- **Body:** `{ startDate, endDate, course? }`

### POST /tee-times/admin/:slotId/block
Block tee-time slot (Admin)
- **Body:** `{ reason }`

### DELETE /tee-times/admin/:slotId/block
Unblock tee-time slot (Admin)

### GET /tee-times/statistics
Get tee-time statistics (Admin)

---

## 💳 Payments

### GET /payments/subscription-plans
Get all subscription plans

### POST /payments/event/checkout
Create event payment checkout
- **Body:** `{ eventId, amount }`
- **Response:** `{ checkoutUrl, sessionId, paymentId }`

### POST /payments/subscriptions
Create subscription checkout
- **Body:** `{ planId }`
- **Response:** `{ checkoutUrl, sessionId }`

### DELETE /payments/subscriptions/:subscriptionId
Cancel subscription
- **Body:** `{ cancelAtPeriodEnd? }`

### GET /payments/me
Get my payment history
- **Query:** `limit, offset`

### GET /payments/subscriptions/me
Get my subscriptions

### POST /payments/:paymentId/refund
Process refund (Admin)
- **Body:** `{ amount?, reason? }`

### POST /webhooks/stripe
Stripe webhook endpoint (internal)

---

## 🔄 PC Caddie Sync

### POST /pccaddie/sync
Trigger full sync (Admin)

### POST /pccaddie/sync/members
Sync only members (Admin)

### POST /pccaddie/sync/tournaments
Sync only tournaments (Admin)

### POST /pccaddie/sync/handicaps
Sync only handicaps (Admin)

### GET /pccaddie/stats
Get sync statistics (Admin)

---

## ⛳ Handicap System

### POST /handicap/rounds
Submit a round score
- **Body:** `{ courseId?, date, strokes, coursePar?, courseRating?, slopeRating? }`
- **Response:** `{ round, handicapBefore, handicapAfter, scoreDifferential }`

### GET /handicap/rounds/me
Get my rounds
- **Query:** `limit, verified`

### GET /handicap/history/me
Get my handicap history
- **Query:** `limit`

### POST /handicap/playing-handicap
Calculate playing handicap for a course
- **Body:** `{ courseRating, slopeRating, coursePar }`
- **Response:** `{ handicapIndex, playingHandicap, ... }`

### DELETE /handicap/rounds/:roundId
Delete a round

### POST /handicap/admin/rounds/:roundId/verify
Verify a round (Admin)

### GET /handicap/admin/stats
Get handicap statistics (Admin)

### GET /handicap/members/:memberId/rounds
Get member's rounds (Admin)
- **Query:** `limit, verified`

---

## 📱 QR Check-In

### POST /qr/event
Generate QR code for event
- **Body:** `{ eventId }`
- **Response:** `{ qrCode }`

### POST /qr/teetime
Generate QR code for tee-time
- **Body:** `{ bookingId }`
- **Response:** `{ qrCode }`

### GET /qr/next-event
Get QR code for my next event
- **Response:** `{ qrCode, event }`

### GET /qr/next-teetime
Get QR code for my next tee-time
- **Response:** `{ qrCode, booking, slot }`

### POST /qr/checkin
Process QR code check-in (Admin/Staff)
- **Body:** `{ qrData }`
- **Response:** `{ success, type, memberName, resourceName, timestamp }`

---

## 🎮 Gamification (from Phase 4)

### GET /gamification/achievements
Get all achievements

### GET /gamification/leaderboard
Get leaderboard
- **Query:** `type (points|events|social), limit`

### GET /gamification/members/:id/stats
Get member gamification stats

### POST /gamification/check/:memberId
Check and award achievements (Admin)

---

## 🌤️ Weather (from Phase 4)

### GET /weather/current
Get current weather

### GET /weather/forecast
Get 5-day forecast

### GET /weather/suitability
Get course playability score

### GET /weather/best-times
Get best playing times for today

---

## 📊 Response Formats

### Success Response
```json
{
  "data": { ... },
  "success": true
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": [ ... ]
}
```

---

## 🔑 Environment Variables

See `.env.example` for all required environment variables:
- Database (PostgreSQL)
- Redis
- JWT secrets
- Stripe keys
- PC Caddie database (optional)
- QR secret key
- FCM (Firebase Cloud Messaging)
- CORS origins
- Frontend URL

---

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Setup database
pnpm prisma:migrate
pnpm prisma:generate

# Seed database (optional)
pnpm prisma:seed

# Start development server
pnpm dev
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- All monetary amounts in Stripe are in cents (EUR)
- Handicaps calculated using World Handicap System (WHS)
- QR codes expire after 24 hours
- Push notifications require FCM configuration
- PC Caddie sync requires MySQL connection

---

## 🔗 Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [PC Caddie Integration](./PC_CADDIE_INTEGRATION.md)
- [Payment System](./PAYMENT_SYSTEM.md)
- [Tee-Time System](./TEETIME_SYSTEM.md)
- [Advanced Features](./ADVANCED_FEATURES.md)
