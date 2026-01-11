/**
 * Vet Plan Schema - Experimental
 *
 * This module contains Drizzle schemas for veterinary practice management.
 * These are intentionally isolated and should NOT be included in the main
 * schema index or used during migrations/db push.
 *
 * See README.md in this folder for more details.
 */

// Appointment & consultation
export * from "./appointments";
// Audit & compliance (Phase 2)
export * from "./audit-logging";
// Billing & payments
export * from "./billing";
// Boarding management (Phase 3)
export * from "./boarding";
// Core business entities
export * from "./clients";
// Clinic & staff management
export * from "./clinics";
// Communication & reminders
export * from "./communication";
// Diagnostics & testing
export * from "./diagnostics";
// Emergency care
export * from "./emergency";
// Insurance management (Phase 3)
export * from "./insurance";
export * from "./inventory";
// Medical records & encounters
export * from "./medical-records";
export * from "./patients";
// Preventive care
export * from "./preventive";
// Role-Based Access Control (Phase 4)
export * from "./rbac";
// Services & products
export * from "./services";
export * from "./staff";
// Surgical procedures
export * from "./surgeries";
// Treatment & medications
export * from "./treatments";
export * from "./veterinarians";
