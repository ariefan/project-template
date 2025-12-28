/**
 * Farm Plan Schema - Experimental
 *
 * This module contains Drizzle schemas converted from Laravel migrations
 * for the AIFarm project. These are intentionally isolated and should NOT
 * be included in the main schema index or used during migrations/db push.
 *
 * See README.md in this folder for more details.
 */

// Breeding & genetics
export * from "./breeding";
export * from "./compliance";
// Dairy processing
export * from "./dairy";
// Equipment & assets
export * from "./equipment";
export * from "./farms";
// Feed management
export * from "./feeds";
// Financial
export * from "./financial";
export * from "./genetics";
// Health management
export * from "./health";
export * from "./herds";
export * from "./indonesian-compliance";
// Inventory
export * from "./inventory";
// Labor & workforce
export * from "./labor";
// Livestock management
export * from "./livestock";
// Core entities
export * from "./locations";

// Meat production
export * from "./meat";
export * from "./species";
// Traceability & compliance
export * from "./traceability";
