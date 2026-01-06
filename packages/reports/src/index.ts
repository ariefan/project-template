/**
 * @workspace/reports
 *
 * Comprehensive reporting system with:
 * - Multiple export formats (CSV, Excel, PDF)
 * - Thermal and dot-matrix printer support (ESC/POS)
 * - Eta template engine for custom layouts
 * - pg-boss job scheduling
 * - Streaming exports for large datasets
 */

export type { ReportEnvConfig, ReportSystemConfig } from "./config";

// Configuration
export { buildServiceConfig, DEFAULT_CONFIG } from "./config";
// Exporters (CSV, Excel, PDF)
export * from "./exporters";
// Printers (Thermal, Dot-Matrix)
export * from "./printers";
// Job scheduler
export * from "./scheduler";
// Business logic services
export * from "./services";
// Streaming exports
export * from "./streaming";
// Template engine
export * from "./templates";
// Core types
export type * from "./types";
