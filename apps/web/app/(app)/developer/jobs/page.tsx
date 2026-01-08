"use client";

import { PageHeader } from "@/components/layouts/page-header";
import { JobsTester } from "./jobs-tester";

export default function DeveloperJobsPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        description="Demonstrate the job queue system with real async jobs - create report jobs from templates or run configurable test jobs with live progress tracking."
        title="Jobs Demo"
      />
      <JobsTester />
    </div>
  );
}
