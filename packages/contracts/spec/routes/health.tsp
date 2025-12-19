import "@typespec/http";

using TypeSpec.Http;

namespace ProjectAPI {
  /**
   * Health check endpoint
   * Not versioned or tenant-scoped - available at root level
   */
  @route("/health")
  @tag("Health")
  interface Health {
    /**
     * Check API health status
     * Returns 200 OK if the API is healthy
     */
    @get
    @summary("Health check")
    check(): {
      /** Service status */
      status: "ok" | "degraded" | "down";

      /** Current timestamp */
      timestamp: utcDateTime;

      /** API version */
      version?: string;

      /** Additional service information */
      services?: {
        database?: "ok" | "degraded" | "down";
        cache?: "ok" | "degraded" | "down";
        storage?: "ok" | "degraded" | "down";
      };
    };
  }
}
