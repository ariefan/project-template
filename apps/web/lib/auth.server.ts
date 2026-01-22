import { headers } from "next/headers";
import { authClient } from "./auth";

/**
 * Get session for server components.
 *
 * This function forwards cookies from the incoming request to Better Auth,
 * enabling server-side session validation in Next.js App Router.
 *
 * @example
 * ```ts
 * // In a server component or page
 * import { getSession } from "@/lib/auth.server";
 *
 * export default async function Page() {
 *   const session = await getSession();
 *   if (!session?.data?.user) {
 *     redirect("/login");
 *   }
 *   return <div>Hello {session.data.user.name}</div>;
 * }
 * ```
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

export async function getOrganizations() {
  const headersList = await headers();
  // biome-ignore lint/suspicious/noExplicitAny: complex union type issue
  return (authClient as any).organization.list({
    fetchOptions: {
      headers: {
        cookie: headersList.get("cookie") ?? "",
      },
    },
  });
}
