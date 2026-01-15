"use server";

import type {
  SystemOrganization,
  UpdateSystemOrganizationRequest,
} from "@workspace/contracts";
import { cookies } from "next/headers";
import {
  apiClient,
  systemOrganizationsDelete,
  systemOrganizationsList,
  systemOrganizationsUpdate,
} from "@/lib/api-client";

export interface ListSystemOrganizationsResult {
  data: {
    organizations: SystemOrganization[];
    total: number; // Assuming API returns total, if not we might need to adjust
  } | null;
  error: string | null;
}

export async function listSystemOrganizations({
  page = 1,
  limit = 20,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ListSystemOrganizationsResult> {
  try {
    const cookieStore = await cookies();

    // Forward cookies to API for authentication
    const { data: result, error } = await systemOrganizationsList({
      client: apiClient,
      query: {
        page,
        pageSize: limit,
        search,
      },
      headers: {
        Cookie: cookieStore.toString(),
      },
    });

    if (error) {
      console.error("API Error listing organizations:", error);
      return { data: null, error: "Failed to fetch organizations" };
    }

    if (!result?.data) {
      return { data: { organizations: [], total: 0 }, error: null };
    }

    return {
      data: {
        organizations: result.data,
        total: result.pagination?.totalCount ?? 0,
      },
      error: null,
    };
    // biome-ignore lint/suspicious/noExplicitAny: error handling
  } catch (error: any) {
    console.error("Failed to list organizations:", error);
    return { data: null, error: "Failed to fetch organizations" };
  }
}

export async function updateSystemOrganization(
  id: string,
  data: UpdateSystemOrganizationRequest
): Promise<{ data: SystemOrganization | null; error: string | null }> {
  try {
    const cookieStore = await cookies();
    const { data: result, error } = await systemOrganizationsUpdate({
      client: apiClient,
      path: { id },
      body: data,
      headers: {
        Cookie: cookieStore.toString(),
      },
    });

    if (error) {
      console.error("API Error updating organization:", error);
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? // biome-ignore lint/suspicious/noExplicitAny: error handling
            (error as any).message
          : "Failed to update organization";
      return { data: null, error: errorMessage };
    }

    return { data: result?.data ?? null, error: null };
    // biome-ignore lint/suspicious/noExplicitAny: error handling
  } catch (error: any) {
    console.error("Failed to update organization:", error);
    return { data: null, error: "Failed to update organization" };
  }
}

export async function deleteSystemOrganization(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const cookieStore = await cookies();
    const { error } = await systemOrganizationsDelete({
      client: apiClient,
      path: { id },
      headers: {
        Cookie: cookieStore.toString(),
      },
    });

    if (error) {
      console.error("API Error deleting organization:", error);
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? // biome-ignore lint/suspicious/noExplicitAny: error handling
            (error as any).message
          : "Failed to delete organization";
      return { success: false, error: errorMessage };
    }

    return { success: true, error: null };
    // biome-ignore lint/suspicious/noExplicitAny: error handling
  } catch (error: any) {
    console.error("Failed to delete organization:", error);
    return { success: false, error: "Failed to delete organization" };
  }
}
