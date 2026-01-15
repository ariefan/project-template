import "@typespec/http";
import "../models/system-organization.tsp";
import "../common/errors.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

@route("/v1/system-organizations")
@tag("System Organizations")
interface SystemOrganizations {
  /**
   * List all system organizations (Admin only)
   */
  @get
  list(
    @query page?: int32 = 1,
    @query pageSize?: int32 = 20,
    @query search?: string,
  ): SystemOrganizationListResponse | UnauthorizedResponse | ForbiddenResponse;

  /**
   * Update a system organization
   */
  @patch
  @route("/{id}")
  update(
    @path id: string,
    @body body: UpdateSystemOrganizationRequest
  ): SystemOrganizationResponse | UnauthorizedResponse | ForbiddenResponse | NotFoundResponse;

  /**
   * Delete a system organization (soft delete)
   */
  @delete
  @route("/{id}")
  delete(
    @path id: string
  ): SoftDeleteResponse | UnauthorizedResponse | ForbiddenResponse | NotFoundResponse;
}
