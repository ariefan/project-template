"use client";

import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function SectionSkeleton() {
  return (
    <Card className="overflow-hidden border-border bg-card/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid gap-0 divide-x divide-transparent border-border border-t sm:grid-cols-2 sm:divide-border">
          <div className="space-y-6 p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div className="space-y-2" key={i}>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6 p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end border-border border-t bg-muted/5 p-4 pr-6">
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}
