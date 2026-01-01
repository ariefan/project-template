import { createClient, createConfig } from "@workspace/contracts/client";
import { env } from "@/lib/env";

/**
 * API client configuration for the web app.
 *
 * Features:
 * - Base URL from environment
 * - Credentials included for cookie-based auth
 * - Common headers for JSON API
 */
export const apiClient = createClient(
  createConfig({
    baseUrl: env.NEXT_PUBLIC_API_URL,
    credentials: "include", // Include cookies for session auth
    headers: {
      "Content-Type": "application/json",
    },
  })
);

/**
 * Configure response interceptor for auth handling.
 *
 * Handles:
 * - 401 Unauthorized: Redirect to login
 * - Other errors: Pass through for component handling
 */
apiClient.interceptors.response.use((response: Response) => {
  // Handle 401 responses by redirecting to login
  if (response.status === 401 && typeof window !== "undefined") {
    const currentPath = window.location.pathname;
    // Don't redirect if already on auth pages
    if (
      !(currentPath.startsWith("/login") || currentPath.startsWith("/register"))
    ) {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }
  return response;
});

/**
 * Export SDK functions with the configured client.
 *
 * These functions will use our configured client with auth handling.
 */
export * from "@workspace/contracts";

/**
 * Helper to check if an error is an API error response.
 */
export function isApiError(
  error: unknown
): error is { error: { code: string; message: string; requestId: string } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as { error: unknown }).error === "object"
  );
}

/**
 * Extract error message from API error response.
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Extract validation errors from API error response.
 */
export function getValidationErrors(
  error: unknown
): Array<{ field: string; message: string }> | null {
  if (
    isApiError(error) &&
    error.error.code === "validationError" &&
    "details" in error.error
  ) {
    return (
      error.error as { details: Array<{ field: string; message: string }> }
    ).details;
  }
  return null;
}
