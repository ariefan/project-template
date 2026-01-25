"use server";

import { cookies } from "next/headers";

export async function listSystemUsers({
  search = "",
}: {
  search?: string;
} = {}) {
  try {
    const cookieStore = await cookies();
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/v1/system-users`);
    if (search) {
      url.searchParams.set("search", search);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Cookie: cookieStore.toString(),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch system users");
    }

    return await response.json();
  } catch (error) {
    console.error("Error listing system users:", error);
    return { data: [], error: "Failed to fetch system users" };
  }
}
