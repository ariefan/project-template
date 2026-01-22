import { redirect } from "next/navigation";
import { getOrganizations, getSession } from "@/lib/auth.server";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.data?.user) {
    redirect("/login");
  }

  const orgs = await getOrganizations();
  if (orgs?.data?.length && orgs.data.length > 0) {
    redirect("/dashboard");
  }

  return <OnboardingForm />;
}
