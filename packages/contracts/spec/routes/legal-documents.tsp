import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/legal-document.tsp";

using TypeSpec.Http;

namespace ProjectAPI {
  // ============================================================================
  // ADMIN ROUTES
  // ============================================================================

  /**
   * Legal Document Administration API
   *
   * Provides endpoints for managing legal documents (ToS, Privacy Policy, etc.):
   * - CRUD operations for documents and versions
   * - Publishing and scheduling
   * - Audit logs
   * - Acceptance exports for compliance
   */
  @route("/v1/admin/legal-documents")
  @tag("Legal Documents (Admin)")
  interface LegalDocumentsAdmin {
    /**
     * List all legal documents
     */
    @get
    @summary("List legal documents")
    list(
      /** Page number */
      @query page?: int32 = 1,

      /** Items per page */
      @query pageSize?: int32 = 20,

      /** Filter by type */
      @query type?: LegalDocumentType,

      /** Filter by status */
      @query status?: LegalDocumentStatus,

      /** Filter by locale */
      @query locale?: string,

      /** Include deleted documents */
      @query includeDeleted?: boolean = false
    ): LegalDocumentListResponse | ErrorResponse;

    /**
     * Get a specific document by ID
     */
    @get
    @route("/{documentId}")
    @summary("Get legal document")
    get(
      /** Document ID */
      @path documentId: string
    ): LegalDocumentWithVersionResponse | ErrorResponse;

    /**
     * Create a new legal document with initial version
     */
    @post
    @summary("Create legal document")
    create(
      /** Document data */
      @body request: CreateLegalDocumentRequest
    ): {
      @statusCode statusCode: 201;
      @body body: LegalDocumentWithVersionResponse;
    } | ErrorResponse;

    /**
     * Update document metadata
     */
    @patch(#{implicitOptionality: true})
    @route("/{documentId}")
    @summary("Update legal document")
    update(
      /** Document ID */
      @path documentId: string,

      /** Updated data */
      @body request: UpdateLegalDocumentRequest
    ): LegalDocumentResponse | ErrorResponse;

    /**
     * Archive (soft delete) a document
     */
    @delete
    @route("/{documentId}")
    @summary("Archive legal document")
    delete(
      /** Document ID */
      @path documentId: string
    ): SoftDeleteResponse | ErrorResponse;

    // --- Version Management ---

    /**
     * List all versions of a document
     */
    @get
    @route("/{documentId}/versions")
    @summary("List document versions")
    listVersions(
      /** Document ID */
      @path documentId: string,

      /** Page number */
      @query page?: int32 = 1,

      /** Items per page */
      @query pageSize?: int32 = 20,

      /** Filter by status */
      @query status?: LegalDocumentStatus
    ): LegalDocumentVersionListResponse | ErrorResponse;

    /**
     * Get a specific version
     */
    @get
    @route("/{documentId}/versions/{versionId}")
    @summary("Get document version")
    getVersion(
      /** Document ID */
      @path documentId: string,

      /** Version ID */
      @path versionId: string
    ): LegalDocumentVersionResponse | ErrorResponse;

    /**
     * Create a new version (as draft)
     */
    @post
    @route("/{documentId}/versions")
    @summary("Create document version")
    createVersion(
      /** Document ID */
      @path documentId: string,

      /** Version data */
      @body request: CreateLegalDocumentVersionRequest
    ): {
      @statusCode statusCode: 201;
      @body body: LegalDocumentVersionResponse;
    } | ErrorResponse;

    /**
     * Update a draft version
     */
    @patch(#{implicitOptionality: true})
    @route("/{documentId}/versions/{versionId}")
    @summary("Update document version")
    updateVersion(
      /** Document ID */
      @path documentId: string,

      /** Version ID */
      @path versionId: string,

      /** Updated data */
      @body request: UpdateLegalDocumentVersionRequest
    ): LegalDocumentVersionResponse | ErrorResponse;

    // --- Publishing ---

    /**
     * Publish a version (makes it active, archives previous)
     */
    @post
    @route("/{documentId}/versions/{versionId}/publish")
    @summary("Publish document version")
    publishVersion(
      /** Document ID */
      @path documentId: string,

      /** Version ID */
      @path versionId: string,

      /** Publish options */
      @body request?: PublishVersionRequest
    ): LegalDocumentVersionResponse | ErrorResponse;

    /**
     * Unpublish a version (revert to previous or no active)
     */
    @post
    @route("/{documentId}/versions/{versionId}/unpublish")
    @summary("Unpublish document version")
    unpublishVersion(
      /** Document ID */
      @path documentId: string,

      /** Version ID */
      @path versionId: string
    ): LegalDocumentVersionResponse | ErrorResponse;

    /**
     * Preview a version (render without publishing)
     */
    @get
    @route("/{documentId}/versions/{versionId}/preview")
    @summary("Preview document version")
    previewVersion(
      /** Document ID */
      @path documentId: string,

      /** Version ID */
      @path versionId: string
    ): LegalDocumentVersionResponse | ErrorResponse;

    // --- Audit & Compliance ---

    /**
     * Get audit log for a document
     */
    @get
    @route("/{documentId}/audit-log")
    @summary("Get document audit log")
    getAuditLog(
      /** Document ID */
      @path documentId: string,

      /** Page number */
      @query page?: int32 = 1,

      /** Items per page */
      @query pageSize?: int32 = 50
    ): LegalDocumentAuditLogListResponse | ErrorResponse;

    /**
     * Get acceptances for a document/version
     */
    @get
    @route("/{documentId}/acceptances")
    @summary("List document acceptances")
    listAcceptances(
      /** Document ID */
      @path documentId: string,

      /** Filter by version */
      @query versionId?: string,

      /** Page number */
      @query page?: int32 = 1,

      /** Items per page */
      @query pageSize?: int32 = 50
    ): LegalDocumentAcceptanceListResponse | ErrorResponse;

    /**
     * Export acceptances for compliance
     */
    @post
    @route("/export-acceptances")
    @summary("Export acceptances")
    exportAcceptances(
      /** Export options */
      @body request: ExportAcceptancesRequest
    ): AsyncJobResponse | ErrorResponse;
  }

  // ============================================================================
  // PUBLIC ROUTES
  // ============================================================================

  /**
   * Legal Documents Public API
   *
   * User-facing endpoints for:
   * - Viewing active legal documents
   * - Accepting documents
   * - Checking acceptance status
   */
  @route("/v1/legal")
  @tag("Legal Documents (Public)")
  interface LegalDocumentsPublic {
    /**
     * List all active legal documents
     */
    @get
    @summary("List active legal documents")
    listActive(
      /** Filter by locale (uses user preference if not specified) */
      @query locale?: string
    ): ActiveLegalDocumentsListResponse | ErrorResponse;

    /**
     * Get the active version of a specific document type
     */
    @get
    @route("/{documentType}")
    @summary("Get active legal document")
    getActive(
      /** Document type */
      @path documentType: LegalDocumentType,

      /** Locale override */
      @query locale?: string
    ): ActiveLegalDocumentResponse | ErrorResponse;

    /**
     * Accept a legal document
     */
    @post
    @route("/accept")
    @summary("Accept legal document")
    accept(
      /** Acceptance data */
      @body request: AcceptLegalDocumentRequest
    ): LegalDocumentAcceptanceResponse | ErrorResponse;

    /**
     * Get current user's acceptance history
     */
    @get
    @route("/my-acceptances")
    @summary("Get my acceptances")
    getMyAcceptances(): MyAcceptancesResponse | ErrorResponse;

    /**
     * Check if user has pending documents to accept
     */
    @get
    @route("/pending")
    @summary("Check pending acceptances")
    checkPending(
      /** Locale override */
      @query locale?: string
    ): PendingAcceptancesResponse | ErrorResponse;
  }
}
