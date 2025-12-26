import {
  type AuthClient,
  createAuthClientInstance,
} from "@workspace/auth/client";
import { env } from "@/src/env";

/**
 * Auth client instance for the web app.
 *
 * The baseURL is read from validated environment configuration.
 */
export const authClient: AuthClient = createAuthClientInstance({
  baseURL: env.NEXT_PUBLIC_API_URL,
});

// Export commonly used auth methods for convenience
export const { signIn, signOut, signUp, useSession } = authClient;
