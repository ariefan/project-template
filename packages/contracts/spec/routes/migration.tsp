import "@typespec/http";

using TypeSpec.Http;

namespace ProjectAPI {
  /**
   * API Version Migration Status
   *
   * Provides information about API version deprecation and migration.
   * Helps clients understand version lifecycle and plan migrations.
   *
   * @see docs/api-guide/08-governance/05-migration.md
   */
  @route("/v1/migration")
  @tag("Migration")
  interface Migration {
    /**
     * Get migration status for the current API version
     *
     * Returns information about:
     * - Current version status (current, deprecated, sunset)
     * - Sunset date if deprecated
     * - Replacement version to migrate to
     * - Breaking changes and migration checklist
     */
    @get
    @route("/status")
    @summary("Get API version migration status")
    getStatus(): MigrationStatusResponse;
  }

  /** Migration status for an API version */
  model MigrationStatusResponse {
    /** API version (e.g., "v1") */
    version: string;

    /** Version lifecycle status */
    status: MigrationStatus;

    /** ISO 8601 date when this version will be removed (if deprecated) */
    sunsetDate?: utcDateTime;

    /** Days remaining until sunset (if deprecated) */
    daysUntilSunset?: int32;

    /** Version to migrate to (if deprecated) */
    replacementVersion?: string;

    /** URL to the migration guide */
    migrationGuideUrl?: string;

    /** List of breaking changes in the replacement version */
    breakingChanges?: string[];

    /** Steps to complete the migration */
    migrationChecklist?: string[];
  }

  /** Version lifecycle status */
  enum MigrationStatus {
    /** Version is current and fully supported */
    current,

    /** Version is deprecated but still functional */
    deprecated,

    /** Version has been removed and is no longer available */
    sunset,
  }
}
