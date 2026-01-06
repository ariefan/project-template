export const EventChannels = {
  user: (userId: string): string => `events:user:${userId}`,
  org: (orgId: string): string => `events:org:${orgId}`,
  system: (): string => "events:system",
  job: (jobId: string): string => `events:job:${jobId}`,
} as const;

export function parseChannel(
  channel: string
): { type: "user" | "org" | "system" | "job"; id?: string } | null {
  const parts = channel.split(":");
  if (parts.length < 2 || parts[0] !== "events") {
    return null;
  }

  const type = parts[1];
  const id = parts[2];

  if (type === "user" && id) {
    return { type: "user", id };
  }
  if (type === "org" && id) {
    return { type: "org", id };
  }
  if (type === "system") {
    return { type: "system" };
  }
  if (type === "job" && id) {
    return { type: "job", id };
  }

  return null;
}
