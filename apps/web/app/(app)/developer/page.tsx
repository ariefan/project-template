"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DeveloperPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to notifications page by default
    router.replace("/developer/notifications");
  }, [router]);

  return null;
}
