"use client";

import { FileManager } from "@workspace/feature-files";
import { env } from "@/lib/env";

export default function FileManagerPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <FileManager apiBaseUrl={env.NEXT_PUBLIC_API_URL} />
    </div>
  );
}
