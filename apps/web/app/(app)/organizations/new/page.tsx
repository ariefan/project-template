"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/page-header";
import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";

export default function CreateOrganizationPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <PageHeader
        backLabel="Back"
        description="Create a new organization to collaborate with your team."
        onBack={() => router.back()}
        title="Create Organization"
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Enter the details for your new organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
}
