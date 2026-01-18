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

@route("/v1/orgs/{orgId}/backups")
@tag("Backups")
namespace Backups {
  /**
   * Create a new backup
   *
   * Initiates an async backup job for the organization.
   * Returns 202 Accepted with the backup record.
   */
  @post
  @summary("Create backup")
  op create(
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
  op list(
    @path orgId: string,
    @query page?: int32 = 1,
    @query pageSize?: int32 = 20,
    @query status?: BackupStatus,
  ): BackupListResponse | ErrorResponse;

  /**
   * Get backup details
   */
  @get
  @route("/{id}")
  @summary("Get backup")
  op get(
    @path orgId: string,
    @path id: string,
  ): BackupResponse | ErrorResponse;

  /**
   * Delete a backup
   */
  @delete
  @route("/{id}")
  @summary("Delete backup")
  op delete(
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
  @post
  @route("/{id}/restore")
  @summary("Restore backup")
  op restore(
    @path orgId: string,
    @path id: string,
  ): {
    @statusCode statusCode: 202;
    @body body: BackupResponse;
  } | ErrorResponse;

  /**
   * Download backup file
   */
  @get
  @route("/{id}/download")
  @summary("Download backup")
  op download(
    @path orgId: string,
    @path id: string,
  ): {
    @statusCode statusCode: 200;
    @header contentType: "application/octet-stream";
    @body body: bytes;
  } | ErrorResponse;
}
