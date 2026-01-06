"use client";

import { PageHeader } from "@/components/layouts/page-header";
import { JobsTester } from "./jobs-tester";

export default function DeveloperJobsPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        description="Test and demonstrate job system with report generation and API integration."
        title="Jobs Tester"
      />
      <JobsTester />
    </div>
  );
}
