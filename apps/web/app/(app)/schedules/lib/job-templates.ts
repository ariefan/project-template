import type { JobTypeInfo } from "@workspace/contracts";
import { apiClient, jobTypesList } from "@/lib/api-client";

/**
 * Fetch job types from the API
 *
 * Returns available job types dynamically from the backend.
 */
export async function fetchJobTypes(): Promise<JobTypeInfo[]> {
  try {
    const response = await jobTypesList({ client: apiClient });

    if (response.error || !response.data) {
      console.warn("Failed to fetch job types from API");
      return [];
    }

    // Type guard for success response
    const data = response.data as {
      data?: JobTypeInfo[];
    };

    if (!data.data) {
      return [];
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching job types:", error);
    return [];
  }
}
