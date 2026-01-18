/**
 * ============================================================================
 * BACKUPS ROUTES - Backup Management
 * ============================================================================
 *
 * Endpoints for creating, listing, and managing backups.
 *
 * Routes:
 * - POST   /v1/orgs/{orgId}/backups           Create backup
 * - GET    /v1/orgs/{orgId}/backups           List backups
 * - GET    /v1/orgs/{orgId}/backups/{id}      Get backup
 * - DELETE /v1/orgs/{orgId}/backups/{id}      Delete backup
 * - POST   /v1/orgs/{orgId}/backups/{id}/restore  Restore backup
 *
 * ============================================================================
 */

import "@typespec/http";
import "../models/backup.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * Backups API endpoints
 *
 * Organization-scoped backup management.
 */
@route("/v1/orgs/{orgId}/backups")
@tag("Backups")
interface Backups {
  /**
   * Create a new backup
   *
   * Initiates an async backup job for the organization.
   * Returns 202 Accepted with the backup record.
   */
  @post
  @summary("Create backup")
  create(
    @path orgId: string,
    @body body: CreateBackupRequest,
  ): {
    @statusCode statusCode: 202;
    @body body: BackupResponse;
  } | ErrorResponse;

  /**
   * List backups
   *
   * Returns paginated list of backups for the organization.
   */
  @get
  @summary("List backups")
  list(
    @path orgId: string,
    @query page?: int32 = 1,
    @query pageSize?: int32 = 20,
    @query status?: BackupStatus,
  ): BackupListResponse | ErrorResponse;

  /**
   * Get backup details
   */
  @route("/{id}")
  @get
  @summary("Get backup")
  get(
    @path orgId: string,
    @path id: string,
  ): BackupResponse | ErrorResponse;

  /**
   * Delete a backup
   */
  @route("/{id}")
  @delete
  @summary("Delete backup")
  delete(
    @path orgId: string,
    @path id: string,
  ): {
    @statusCode statusCode: 204;
  } | ErrorResponse;

  /**
   * Restore from backup
   *
   * Initiates an async restore job from the specified backup.
   */
  @route("/{id}/restore")
  @post
  @summary("Restore backup")
  restore(
    @path orgId: string,
    @path id: string,
  ): {
    @statusCode statusCode: 202;
    @body body: BackupResponse;
  } | ErrorResponse;

  /**
   * Download backup file
   */
  @route("/{id}/download")
  @get
  @summary("Download backup")
  download(
    @path orgId: string,
    @path id: string,
  ): {
      @statusCode statusCode: 302;
      @header location: string;
    } | ErrorResponse;
}
