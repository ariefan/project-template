import { headers } from "next/headers";
import { authClient } from "./auth";

/**
 * Get session for server components/routes.
 */
export async function getSession() {
  const headersList = await headers();
  return authClient.getSession({
    fetchOptions: {
      headers: {
        cookie: headersList.get("cookie") ?? "",
      },
    },
  });
}
