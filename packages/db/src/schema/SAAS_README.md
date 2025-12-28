# SaaS Infrastructure Schema

A minimal, production-ready SaaS billing system for **multi-app, multi-tenant** applications.

## Overview

The SaaS infrastructure consists of just **2 files** with **3 tables**:

1. **saas-plans.ts** - Subscription plan definitions (product catalog)
2. **saas-subscriptions.ts** - Organization subscriptions + coupons

**Multi-App Ready:** Organizations can subscribe to different applications with different plans.

**That's it!** Everything else (invoices, payments, usage tracking) is handled by your payment gateway or can be added later when needed.

## Architecture Decisions

### ✅ Design Principles

- **Minimal by design** - Only 3 tables to get started
- **Multi-app ready** - One subscription per org per app
- **Gateway-first** - Let Stripe/Xendit handle invoices & payments
- **Type-safe** - Full TypeScript support with inferred types
- **Flexible** - JSON fields for plan features (no migrations needed)
- **Add as you grow** - Start simple, extend when you actually need it

### 💰 Money Storage

All monetary values are stored as **integers in the smallest currency unit**:
- USD: Store cents (e.g., $10.00 = 1000 cents)
- IDR: Store sen (e.g., Rp 10,000 = 1,000,000 sen)

This avoids floating-point precision issues in financial calculations.

### 🔑 ID Strategy

All IDs use `text` type with prefixes for easy identification:
- Plans: `plan_basic_monthly`, `plan_pro_yearly`
- Subscriptions: `sub_abc123`
- Invoices: `inv_abc123`
- Payments: `pay_abc123`
- Features: `feat_abc123`
- Usage: `usage_abc123`

## Data Model

### 📦 3 Tables Total

```
applications (your apps)
  ↓
plans (product catalog per app)
  ↓
subscriptions (org + app → plan)

coupons (discount codes)
```

### Multi-App Architecture

```
Clinic App                 Pharmacy App
  ├─ plan_clinic_basic       ├─ plan_pharmacy_starter
  ├─ plan_clinic_pro         └─ plan_pharmacy_pro
  └─ plan_clinic_enterprise

org_abc → Clinic Basic + Pharmacy Pro
org_xyz → Clinic Enterprise only
```

### Plans (Product Catalog)

```typescript
{
  id: "plan_clinic_basic_monthly",
  applicationId: "app_clinic", // Per-app plans
  name: "Basic",
  slug: "basic",
  priceCents: 99000, // Rp 990/month in sen
  currency: "IDR",
  billingPeriod: "monthly",
  trialDays: 14,
  features: {
    maxUsers: 5,
    maxLocations: 1,
    maxStorageGb: 10,
    advancedReporting: false,
    apiAccess: false
    // Add any custom features here!
  }
}
```

### Subscriptions

```typescript
{
  id: "sub_abc123",
  organizationId: "org_clinic_xyz",
  applicationId: "app_clinic", // One sub per org per app
  planId: "plan_clinic_basic_monthly",
  status: "active",

  // Trial
  trialStartsAt: "2024-01-01T00:00:00Z",
  trialEndsAt: "2024-01-15T00:00:00Z",

  // Billing period
  currentPeriodStart: "2024-01-01T00:00:00Z",
  currentPeriodEnd: "2024-02-01T00:00:00Z",

  // Discount (if coupon applied)
  couponId: "LAUNCH50",
  discountPercent: 50,

  // Gateway sync
  providerSubscriptionId: "sub_stripe_xyz",
  providerCustomerId: "cus_stripe_abc"
}

// Same org can subscribe to multiple apps
{
  id: "sub_def456",
  organizationId: "org_clinic_xyz", // Same org
  applicationId: "app_pharmacy",    // Different app
  planId: "plan_pharmacy_pro_monthly",
  status: "active"
}
```

### Coupons

```typescript
{
  id: "coupon_launch",
  code: "LAUNCH50", // What users enter
  type: "percent",
  percentOff: 50, // 50% off

  // Validity
  isActive: true,
  expiresAt: "2024-12-31T00:00:00Z",

  // Limits
  maxRedemptions: 100,
  currentRedemptions: 23,
  firstTimeOnly: true
}
```

## Common Workflows

### 1. Creating a New Subscription

```typescript
const subscription = await db.insert(subscriptions).values({
  id: generateId("sub"),
  organizationId: "org_clinic_xyz",
  applicationId: "app_clinic", // Specify which app
  planId: "plan_clinic_basic_monthly",
  status: "trialing",
  trialStartsAt: new Date(),
  trialEndsAt: addDays(new Date(), 14),
  currentPeriodStart: new Date(),
  currentPeriodEnd: addMonths(new Date(), 1),
});
```

### 2. Applying a Coupon

```typescript
// Validate coupon
const coupon = await db.query.coupons.findFirst({
  where: and(
    eq(coupons.code, "LAUNCH50"),
    eq(coupons.isActive, true),
    or(isNull(coupons.expiresAt), gt(coupons.expiresAt, new Date()))
  ),
});

if (!coupon) throw new Error("Invalid coupon");
if (coupon.maxRedemptions && coupon.currentRedemptions >= coupon.maxRedemptions) {
  throw new Error("Coupon limit reached");
}

// Apply to subscription
await db.update(subscriptions).set({
  couponId: coupon.code,
  discountPercent: coupon.percentOff,
  discountAmountCents: coupon.amountOffCents,
});

// Increment redemption count
await db.update(coupons)
  .set({ currentRedemptions: coupon.currentRedemptions + 1 })
  .where(eq(coupons.id, coupon.id));
```

### 3. Checking Feature Access

```typescript
async function hasFeature(
  orgId: string,
  appId: string,
  featureKey: string
): Promise<boolean> {
  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.organizationId, orgId),
      eq(subscriptions.applicationId, appId)
    ),
    with: { plan: true },
  });

  if (!sub || !["trialing", "active"].includes(sub.status)) {
    return false;
  }

  return sub.plan.features?.[featureKey] === true;
}

// Usage
await hasFeature("org_123", "app_clinic", "advancedReporting");
```

### 4. Upgrading/Downgrading Plans

```typescript
async function changePlan(subscriptionId: string, newPlanId: string) {
  await db.update(subscriptions)
    .set({ planId: newPlanId })
    .where(eq(subscriptions.id, subscriptionId));

  // Update in payment gateway too
  await stripe.subscriptions.update(sub.providerSubscriptionId, {
    items: [{ price: newPlanId }],
    proration_behavior: 'create_prorations',
  });
}
```

### 5. Calculating Subscription Price

```typescript
async function getSubscriptionPrice(subscriptionId: string): Promise<number> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
    with: { plan: true },
  });

  let priceCents = sub.plan.priceCents;

  // Apply discount if coupon exists
  if (sub.discountPercent) {
    priceCents = priceCents * (100 - sub.discountPercent) / 100;
  } else if (sub.discountAmountCents) {
    priceCents = Math.max(0, priceCents - sub.discountAmountCents);
  }

  return priceCents;
}
```

## Extension Points

### Custom Plan Features

The `features` JSONB field is completely flexible - add whatever you need:

```typescript
const plan = {
  features: {
    // Limits
    maxUsers: 10,
    maxLocations: 3,
    maxStorageGb: 50,

    // Feature flags
    apiAccess: true,
    whitelabelBranding: true,
    advancedReporting: true,

    // Custom anything!
    customReports: ["financial", "clinical", "inventory"],
    integrations: ["quickbooks", "xero"],
    supportLevel: "priority",
  }
}
```

No migrations needed - just update the JSON!

### Multi-Currency Support

Built-in support for multiple currencies:

```typescript
// IDR plan
{ priceCents: 99000, currency: "IDR" } // Rp 990

// USD plan
{ priceCents: 9900, currency: "USD" } // $99.00
```

### Coupon Types

Three coupon types out of the box:

```typescript
// Percentage discount
{ type: "percent", percentOff: 20 } // 20% off

// Fixed amount discount
{ type: "fixed", amountOffCents: 50000 } // Rp 500 off

// Trial extension
{ type: "trial_extension", trialExtensionDays: 30 } // Extra 30 days trial
```

## Migration Strategy

To apply this schema to your database:

```bash
# Generate migration
pnpm db:generate

# Review the migration in packages/db/drizzle/

# Apply migration
pnpm db:push
```

## When to Add More Tables

Start simple, add complexity when you need it:

### Add Later (When Needed):
- **Invoices table** - If you need custom invoice generation (gateway usually handles this)
- **Payments table** - If you need detailed payment tracking (gateway usually handles this)
- **Usage tracking** - When you need to enforce quotas (start with honor system)
- **Feature flags table** - When you need per-org overrides (plan features work for most cases)
- **Subscription events** - When you need audit logs for compliance

### Payment Gateway Does This:
- Invoice generation
- Payment processing
- Failed payment retry
- Refund handling
- Webhook events

Don't build what Stripe/Xendit already provides!

## Testing Checklist

- [ ] Create subscription with trial
- [ ] Apply coupon code
- [ ] Check feature access
- [ ] Upgrade/downgrade plan
- [ ] Cancel subscription
- [ ] Trial expiration
- [ ] Calculate discounted price

## Security Considerations

⚠️ **Never store**:
- Full credit card numbers
- CVV codes
- Unencrypted PII

✅ **Always**:
- Use payment gateway tokens
- Store only last 4 digits
- Encrypt sensitive data
- Validate webhook signatures
- Use HTTPS for all payment flows

## Next Steps

1. **Seed Plans** - Create your initial subscription plans
2. **Payment Gateway** - Integrate Stripe/Xendit/Midtrans
3. **Webhooks** - Handle payment events
4. **Billing Service** - Create invoice generation logic
5. **Usage Service** - Track and enforce quotas
6. **Admin UI** - Build subscription management interface
