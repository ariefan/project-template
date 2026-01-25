import "../common/responses.tsp";

namespace ProjectAPI;

/**
 * System organization model
 */
model SystemOrganization {
  /**
   * Organization ID
   */
  id: string;

  /**
   * Organization name
   */
  name: string;

  /**
   * Organization slug
   */
  slug: string;

  /**
   * Organization logo URL
   */
  logo: string | null;

  /**
   * Creation date
   */
  createdAt: string; // serialized date

  /**
   * Metadata (JSON string or object)
   */
  metadata: string | null;

  /**
   * Total number of members in the organization
   */
  memberCount?: int32;
}

/**
 * Request to update a system organization
 */
model UpdateSystemOrganizationRequest {
  name?: string;
  slug?: string;
  logo?: string | null;
  metadata?: string | null;
}

/**
 * System organization response
 */
model SystemOrganizationResponse is SingleResourceResponse<SystemOrganization>;

/**
 * List of system organizations response
 */
model SystemOrganizationListResponse is CollectionResponse<SystemOrganization>;
