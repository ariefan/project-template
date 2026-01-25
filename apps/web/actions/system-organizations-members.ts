"use server";

import { cookies } from "next/headers";

export async function listOrganizationMembers(orgId: string) {
  try {
    const cookieStore = await cookies();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/system-organizations/${orgId}/members`,
      {
        headers: {
          Cookie: cookieStore.toString(),
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch members");
    }

    return await response.json();
  } catch (error) {
    console.error("Error listing organization members:", error);
    return { data: [], error: "Failed to fetch members" };
  }
}
