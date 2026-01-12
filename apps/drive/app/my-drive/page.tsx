"use client";

import { FileManager } from "@workspace/feature-files";

export default function MyDrivePage() {
  // Base URL is /api, the api.ts adds /storage for each endpoint
  return <FileManager apiBaseUrl="/api" />;
}
