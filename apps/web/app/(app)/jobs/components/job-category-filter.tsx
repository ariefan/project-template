"use client";

import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { JobCategory } from "../hooks/use-unified-jobs";

interface JobCategoryFilterProps {
  value: JobCategory;
  onChange: (value: JobCategory) => void;
}

export function JobCategoryFilter({ value, onChange }: JobCategoryFilterProps) {
  return (
    <Tabs
      className="w-auto"
      onValueChange={(v) => onChange(v as JobCategory)}
      value={value}
    >
      <TabsList>
        <TabsTrigger value="all">All Jobs</TabsTrigger>
        <TabsTrigger value="background">Background</TabsTrigger>
        <TabsTrigger value="report">Reports</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export function useJobCategoryFromUrl(): {
  category: JobCategory;
  setCategory: (category: JobCategory) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const typeParam = searchParams.get("type");
  const category: JobCategory =
    typeParam === "background" || typeParam === "report" ? typeParam : "all";

  const setCategory = (newCategory: JobCategory) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newCategory === "all") {
      params.delete("type");
    } else {
      params.set("type", newCategory);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return { category, setCategory };
}
