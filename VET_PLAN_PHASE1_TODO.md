# Vet Plan Phase 1 - Remaining Tasks

## Completed ✅

1. **Fixed boolean type bugs** - All text-based boolean fields converted to proper `boolean()` type
   - billing.ts: `taxable` field
   - communication.ts: `isActive`, `isDefault`, `isPinned`, `isImportant`, `isPrivate`, `isAlert`, `showOnRecords`
   - diagnostics.ts: `isCritical` field
   - emergency.ts: `isStabilized` field

2. **Created medical encounters table** - Unified clinical record system
   - New `medical-records.ts` with comprehensive encounter tracking
   - SOAP notes, vital signs, diagnoses, procedures
   - Encounter attachments for documents
   - Added `encounterId` to consultations table

## Remaining Tasks

### 3. Add FK Constraints to Prevent Orphaned Records

Many UUID fields currently lack foreign key constraints, risking orphaned records.

#### Critical FK Constraints Needed:

**A. Patient References (animalId → patients.id)**
Files that need updating:
- `appointments.ts`: line 84 - `animalId: uuid("animal_id").notNull()`
- `emergency.ts`: lines 77, 166 - `animalId` fields
- `surgeries.ts`: lines 78, 164 - `animalId` fields
- `diagnostics.ts`: lines 75, 191 - `animalId` fields
- `preventive.ts`: lines 72, 138, 201, 277 - `animalId` fields
- `treatments.ts`: lines 86, 140, 222 - `animalId` fields

**Change pattern:**
```typescript
// BEFORE:
animalId: uuid("animal_id").notNull(),

// AFTER:
animalId: uuid("animal_id")
  .notNull()
  .references(() => patients.id, { onDelete: "cascade" }),
```

**B. Client References (ownerId → clients.id)**
Files that need updating:
- `appointments.ts`: line 85 - `ownerId: uuid("owner_id").notNull()`
- `emergency.ts`: line 78 - `ownerId` field
- `treatments.ts`: line 141 - `ownerId` field

**Change pattern:**
```typescript
// BEFORE:
ownerId: uuid("owner_id").notNull(),

// AFTER:
ownerId: uuid("owner_id")
  .notNull()
  .references(() => clients.id, { onDelete: "cascade" }),
```

**C. Staff Member References**
Many fields reference staff members but lack FK constraints:
- `medical-records.ts`: `dischargedBy`, `cancelledBy`, `uploadedBy`
- `treatments.ts`: `administeredBy`
- `patients.ts`: `measuredBy`, `uploadedBy`
- `diagnostics.ts`: `resultedBy`, `reviewedBy`, `performedBy`, `interpretedBy`
- `preventive.ts`: `administeredBy` (multiple tables)
- `inventory.ts`: `performedBy`, `createdBy`
- `communication.ts`: `sentBy`, `createdBy` (multiple tables)
- `billing.ts`: `processedBy`, `createdBy`
- `staff.ts`: `approvedBy` (multiple tables)
- `surgeries.ts`: `monitoredBy`

**Change pattern:**
```typescript
// BEFORE:
createdBy: uuid("created_by"), // Staff member ID

// AFTER:
createdBy: uuid("created_by").references(() => staff.id, {
  onDelete: "set null",
}),
```

**D. Other Cross-Table References**
- `communication.ts`: `templateId` → `messageTemplates.id`
- `communication.ts`: `invoiceId` → `invoices.id`
- `billing.ts`: `itemId` → Conditional (service/product/medication)
- `services.ts`: `parentCategoryId` → `serviceCategories.id`
- `inventory.ts`: `referenceId` → Conditional reference

**E. User References (userId)**
These fields reference users from an external auth system:
- `clients.ts`: line 57
- `staff.ts`: line 70
- `veterinarians.ts`: line 66

**Decision needed:** These may need to remain without FK constraints if the user table is in a separate schema/database.

#### Import Updates Needed:

When adding FK constraints, ensure the referenced tables are imported:

```typescript
// Example for appointments.ts:
import { clients } from "./clients";
import { patients } from "./patients";
```

### 4. Add Check Constraints for Data Validation

Add database-level validation for business rules:

**A. Date Range Validations**
```typescript
// Example: appointments.ts
export const appointments = pgTable(
  "vet_appointments",
  {
    // ... fields ...
  },
  (table) => [
    // ... existing indexes ...
    check("scheduled_end_after_start", sql`scheduled_end_at > scheduled_at`),
    check("checkout_after_checkin", sql`checked_out_at >= checked_in_at`),
  ]
);
```

Files needing date validations:
- `appointments.ts`: scheduledEndAt > scheduledAt, checkedOutAt >= checkedInAt
- `medical-records.ts`: actualEndAt >= actualStartAt
- `emergency.ts`: treatmentStartedAt >= presentedAt
- `surgeries.ts`: actualEndTime >= actualStartTime
- `staff.ts`: endDate > startDate (employment), returnDate > leaveStartDate

**B. Amount Validations (must be >= 0)**
```typescript
// Example: billing.ts
check("subtotal_positive", sql`subtotal >= 0`),
check("total_positive", sql`total_amount >= 0`),
check("amount_paid_positive", sql`amount_paid >= 0`),
check("amount_due_equals_total_minus_paid",
  sql`amount_due = total_amount - amount_paid`),
```

Files needing amount validations:
- `billing.ts`: subtotal, taxAmount, totalAmount, amountPaid, amountDue
- `medical-records.ts`: estimatedCost, actualCost
- `inventory.ts`: unitCost, sellingPrice, quantityOnHand, reorderPoint
- `services.ts`: basePrice, maxPrice

**C. Percentage Validations (0-100)**
```typescript
check("discount_percentage_valid",
  sql`discount_percentage >= 0 AND discount_percentage <= 100`),
check("tax_rate_valid",
  sql`tax_rate >= 0 AND tax_rate <= 100`),
```

Files needing percentage validations:
- `billing.ts`: discountPercentage, taxRate
- `inventory.ts`: profitMarginPercentage

**D. Conditional Field Validations**
```typescript
// Example: If status is 'cancelled', cancellationReason must be provided
check("cancelled_must_have_reason",
  sql`(status != 'cancelled') OR (cancellation_reason IS NOT NULL)`),
```

**E. Enum-like Text Field Validations**
For text fields that should only contain specific values:
```typescript
check("status_valid",
  sql`status IN ('scheduled', 'sent', 'acknowledged', 'dismissed', 'expired')`),
```

### 5. Test All Changes

After adding FK and check constraints:
```bash
pnpm --filter @workspace/db typecheck
pnpm --filter @workspace/db test  # If tests exist
```

### 6. Commit and Push

```bash
git add .
git commit -m "feat(db): complete Phase 1 production readiness fixes for vet-plan"
git push -u origin claude/check-vet-plan-schema-sSHIf
```

## Estimated Effort

- FK Constraints: ~2-3 hours (systematic updates across all files)
- Check Constraints: ~2-3 hours (careful validation logic)
- Testing & fixes: ~1 hour

**Total: ~5-7 hours**

## Notes

- FK constraints should use `cascade` for dependent records and `set null` for optional references
- Check constraints require importing `sql` from drizzle-orm
- Consider adding indexes for all new FK constraint fields if not already indexed
- Some userId fields may need to remain without FK constraints if they reference external auth systems
