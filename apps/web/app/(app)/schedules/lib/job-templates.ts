import { apiClient, jobTypesList } from "@/lib/api-client";

/**
 * Job Templates for Scheduled Jobs
 *
 * Defines the structure for job types fetched from the API.
 */

export interface JobTemplate {
  type: string;
  label: string;
  description: string;
  exampleConfig: Record<string, unknown>;
  configSchema?: string;
}

/**
 * Fetch job types from the API
 *
 * Returns available job types dynamically from the backend.
 */
export async function fetchJobTypes(): Promise<JobTemplate[]> {
  try {
    const response = await jobTypesList({ client: apiClient });

    if (response.error || !response.data) {
      console.warn("Failed to fetch job types from API");
      return [];
    }

    // Type guard for success response
    const data = response.data as {
      data?: Array<{
        type: string;
        label: string;
        description: string;
        configSchema?: string;
        exampleConfig?: Record<string, unknown>;
      }>;
    };

    if (!data.data) {
      return [];
    }

    return data.data.map((jt) => ({
      type: jt.type,
      label: jt.label,
      description: jt.description,
      configSchema: jt.configSchema,
      exampleConfig: jt.exampleConfig ?? {},
    }));
  } catch (error) {
    console.error("Error fetching job types:", error);
    return [];
  }
}
