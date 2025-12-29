# Vet Plan Schema (Experimental)

This folder contains Drizzle schemas for veterinary practice management. These schemas are **intentionally isolated** and should be treated as experimental reference implementations only.

## Important Notice

**DO NOT** include this folder in:

- The main `packages/db/src/schema/index.ts` exports
- Any migration generation (`pnpm drizzle-kit generate`)
- Any database push operations (`pnpm drizzle-kit push`)
- Production database schemas

## Purpose

These schemas serve as a reference for:

- Veterinary clinic and practice management
- Animal health record systems
- Veterinary appointment and consultation tracking
- Medical treatment and prescription management
- Diagnostic testing and laboratory results
- Surgical procedure tracking
- Emergency care coordination

## Schema Overview

The schemas are organized into the following modules:

| File | Description |
|------|-------------|
| `clinics.ts` | Veterinary clinics, hospitals, and practice locations |
| `veterinarians.ts` | Veterinarian profiles, licenses, and specializations |
| `appointments.ts` | Appointment scheduling, consultations, and visits |
| `diagnostics.ts` | Diagnostic tests, lab results, and imaging |
| `treatments.ts` | Medical treatments, prescriptions, and medications |
| `surgeries.ts` | Surgical procedures, anesthesia, and post-op care |
| `emergency.ts` | Emergency care, triage, and critical cases |
| `preventive.ts` | Preventive care programs, wellness checks, and vaccinations |

## Usage

If you need to use these schemas in the future:

1. Review and adapt the schemas for your specific needs
2. Ensure proper foreign key relationships with existing auth tables
3. Add the necessary exports to `packages/db/src/schema/index.ts`
4. Run migrations to apply to your database

## Schema Conventions

The following conventions are used throughout these schemas:

### Primary Keys
- **UUID with `.defaultRandom()`** for main entities (clinics, appointments, treatments)
- **`serial`** for high-volume transactional records

### Foreign Keys
- **`integer()`** for references to `serial` primary keys
- **`uuid()`** for references to UUID primary keys
- All FK columns must have indexes for query performance

### Relationships
- **Cascade deletes** for owned relationships
- **Set null** for reference relationships

### Enums
- Defined at top of each file using `pgEnum()`
- Type exports provided using array index pattern: `(typeof enumName.enumValues)[number]`

### Type Exports
- `$inferSelect` for row types (e.g., `AppointmentRow`)
- `$inferInsert` for insert types (e.g., `NewAppointmentRow`)
- Enum value types exported separately

### Timestamps
- Standard pattern: `createdAt` with `.defaultNow()` and `updatedAt` with `.$onUpdate()`
- Soft deletes use optional `deletedAt` timestamp

## Regulatory Compliance

This schema is designed to support compliance with veterinary practice regulations:

### Veterinary Practice Acts
- **State Licensing**: Veterinarian license tracking and verification
- **Controlled Substances**: DEA registration and prescription monitoring
- **Medical Records**: Minimum retention periods (typically 3-7 years)
- **VCPR Requirements**: Valid Veterinarian-Client-Patient Relationship documentation

### Prescription Monitoring
- **Controlled Substances**: DEA schedule tracking
- **Withdrawal Periods**: Food animal medication tracking
- **Compounding Records**: Custom medication formulations
- **Adverse Event Reporting**: Drug reaction documentation

### Laboratory & Diagnostics
- **CLIA Compliance**: Clinical Laboratory Improvement Amendments
- **Reference Lab Integration**: External laboratory result tracking
- **Quality Control**: Test validation and calibration records
- **Critical Values**: Immediate notification protocols

### Emergency Care
- **Triage Protocols**: Emergency Severity Index (ESI) tracking
- **Transfer Documentation**: Referral and transfer records
- **After-Hours Care**: On-call veterinarian tracking
- **Critical Care Monitoring**: Vital signs and treatment protocols

## Integration Notes

- **Livestock Integration**: Can link to farm-plan schemas for production animal care
- **Patient Records**: User references typed as `uuid` without FK constraints for isolation
- **Billing Integration**: Can integrate with SaaS billing for practice management
- **Inventory**: Links to inventory module for medical supplies and medications
