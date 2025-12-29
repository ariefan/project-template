/**
 * Vet Plan Schema - Experimental
 *
 * This module contains Drizzle schemas for veterinary practice management.
 * These are intentionally isolated and should NOT be included in the main
 * schema index or used during migrations/db push.
 *
 * See README.md in this folder for more details.
 */

// Core business entities
export * from "./clients";
export * from "./patients";

// Clinic & staff management
export * from "./clinics";
export * from "./veterinarians";
export * from "./staff";

// Services & products
export * from "./services";
export * from "./inventory";

// Billing & payments
export * from "./billing";

// Appointment & consultation
export * from "./appointments";

// Diagnostics & testing
export * from "./diagnostics";

// Treatment & medications
export * from "./treatments";

// Surgical procedures
export * from "./surgeries";

// Emergency care
export * from "./emergency";

// Preventive care
export * from "./preventive";

// Communication & reminders
export * from "./communication";
