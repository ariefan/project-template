import {
  type AuthClient,
  createAuthClientInstance,
} from "@workspace/auth/client";
import { env } from "@/lib/env";

export const authClient: AuthClient = createAuthClientInstance({
  baseURL: env.NEXT_PUBLIC_API_URL,
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  organization,
  useActiveOrganization,
  useListOrganizations,
} = authClient;

export type Session = NonNullable<ReturnType<typeof useSession>["data"]>;
