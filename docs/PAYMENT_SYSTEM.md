# Payment & Monetization System

## Use Cases

### Event-Gebühren
- Turniere mit Startgeld
- Premium-Trainings (kostenpflichtig)
- Social Events mit Teilnahmegebühr

### Mitgliedsbeiträge
- Jahresbeiträge (Auto-Renewal)
- Monatliche Raten
- Trial-to-Full Conversion

### Pro-Shop / Merchandise
- Golfbälle, Tees, Handschuhe
- Club-Merchandise (Shirts, Caps)
- Equipment

### Zusatzleistungen
- Golfcart-Miete
- Driving Range Bälle
- Personal Training Buchungen

## Tech Stack: Stripe Integration

### Features
- ✅ One-time Payments (Events)
- ✅ Subscriptions (Mitgliedsbeiträge)
- ✅ Payment Links (schnell für Events)
- ✅ Checkout Sessions
- ✅ Webhooks (Payment Success/Failed)
- ✅ Refunds
- ✅ Invoices

### Prisma Schema

```prisma
model Payment {
  id String @id @default(uuid())

  memberId String
  amount   Int    // in cents
  currency String @default("EUR")

  type PaymentType
  status PaymentStatus @default(PENDING)

  // References
  eventId       String?
  subscriptionId String?

  // Stripe
  stripePaymentIntentId String? @unique
  stripeCheckoutSessionId String? @unique

  // Metadata
  description String?
  receiptUrl  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  paidAt    DateTime?

  member Member @relation(fields: [memberId], references: [id])

  @@index([memberId, status])
}

enum PaymentType {
  EVENT_FEE
  MEMBERSHIP
  MERCHANDISE
  SERVICE
  OTHER
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELLED
  REFUNDED
}

model Subscription {
  id String @id @default(uuid())

  memberId String
  planId   String

  stripeSubscriptionId String @unique
  stripeCustomerId     String

  status SubscriptionStatus @default(ACTIVE)

  currentPeriodStart DateTime
  currentPeriodEnd   DateTime

  cancelAtPeriodEnd Boolean @default(false)
  cancelledAt       DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  member Member           @relation(fields: [memberId], references: [id])
  plan   SubscriptionPlan @relation(fields: [planId], references: [id])

  @@index([memberId, status])
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  UNPAID
}

model SubscriptionPlan {
  id   String @id @default(uuid())
  name String @unique

  description String?

  amount   Int    // in cents
  currency String @default("EUR")
  interval String @default("year") // month, year

  stripePriceId String @unique

  isActive Boolean @default(true)

  subscriptions Subscription[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## API Endpoints

```typescript
// Create payment for event
POST /api/v1/payments/event/:eventId/checkout
Response: { checkoutUrl: "https://checkout.stripe.com/..." }

// Create subscription
POST /api/v1/payments/subscriptions
{ planId: "full-membership-annual" }

// Get payment history
GET /api/v1/payments/me

// Admin: Refund
POST /api/v1/payments/:paymentId/refund

// Webhook (Stripe → Backend)
POST /api/v1/webhooks/stripe
```

## Implementation

### Environment
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLIC_KEY=pk_test_...
```

### Example: Event Payment

```typescript
// Event Service
async createEventWithFee(eventData, fee?: number) {
  const event = await prisma.event.create({
    data: {
      ...eventData,
      requiresPayment: !!fee,
      paymentAmount: fee,
    }
  });

  if (fee) {
    // Create Stripe Product
    const product = await stripe.products.create({
      name: event.title,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: fee * 100, // EUR to cents
      currency: 'eur',
    });

    await prisma.event.update({
      where: { id: event.id },
      data: { stripePriceId: price.id }
    });
  }

  return event;
}

// Registration with Payment
async registerWithPayment(eventId, memberId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (event.requiresPayment) {
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'sepa_debit'],
      mode: 'payment',
      customer_email: member.email,
      line_items: [{
        price: event.stripePriceId,
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/events/${eventId}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/events/${eventId}`,
      metadata: {
        eventId,
        memberId,
      }
    });

    return { checkoutUrl: session.url };
  }
}
```

### Webhook Handler

```typescript
// Handle Stripe Webhooks
async handleStripeWebhook(signature, rawBody) {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;

      // Confirm event registration
      await eventsService.confirmRegistration(
        session.metadata.eventId,
        session.metadata.memberId
      );

      // Send confirmation email
      break;

    case 'payment_intent.succeeded':
      // Mark payment as successful
      break;

    case 'invoice.payment_failed':
      // Handle failed subscription payment
      break;
  }
}
```

## Pricing Examples (Golfclub Siek)

### Mitgliedsbeiträge
- Vollmitgliedschaft: 1.200€/Jahr
- Seniorenmitgliedschaft: 900€/Jahr
- Jugendmitgliedschaft: 300€/Jahr
- Trial: 150€/Monat

### Event-Gebühren
- Clubturnier: 15€
- Premium-Training: 50€
- Gäste-Greenfee: 80€

### Services
- Golfcart: 25€/Runde
- Driving Range (100 Bälle): 5€
- Personal Training: 80€/Stunde

## Benefits

✅ **Automatische Abrechnung**
✅ **Keine manuellen Überweisungen**
✅ **Sofortige Event-Bestätigung**
✅ **Subscription Auto-Renewal**
✅ **Transparente Historie**
✅ **SEPA & Kreditkarte**
