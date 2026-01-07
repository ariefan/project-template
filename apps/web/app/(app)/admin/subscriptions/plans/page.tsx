"use client";

import { useQuery } from "@tanstack/react-query";
import { subscriptionPlansAdminListOptions } from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient } from "@/lib/api-client";

export default function AdminPlansPage() {
  const { data: response, isLoading } = useQuery({
    ...subscriptionPlansAdminListOptions({
      client: apiClient,
      query: { pageSize: 100 },
    }),
  });

  const plans = response && !("error" in response) ? response.data : [];

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        actions={
          <Button className="gap-2 font-bold shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Create Plan
          </Button>
        }
        description="Manage service tiers, pricing, and features."
        title="Subscription Plans"
      />

      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardHeader className="bg-muted/30">
          <CardTitle className="font-bold text-xl uppercase tracking-tight decoration-primary/30 underline-offset-4">
            Active Plans
          </CardTitle>
          <CardDescription>
            All subscription plans visible to users and admins.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="pl-6 font-bold text-[11px] uppercase tracking-widest">
                  Name
                </TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-widest">
                  Pricing
                </TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-widest">
                  Period
                </TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-widest">
                  Status
                </TableHead>
                <TableHead className="pr-6 text-right font-bold text-[11px] uppercase tracking-widest">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i.toString()}`}>
                    <TableCell className="pl-6">
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Skeleton className="ml-auto h-8 w-24" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading &&
                plans.length > 0 &&
                plans.map((plan) => (
                  <TableRow
                    className="group transition-colors hover:bg-muted/50"
                    key={plan.id}
                  >
                    <TableCell className="pl-6 font-bold">
                      <div className="flex flex-col">
                        <span>{plan.name}</span>
                        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-tight">
                          {plan.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      ${plan.priceCents / 100}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="font-medium capitalize"
                        variant="outline"
                      >
                        {plan.billingPeriod}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          plan.isActive
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            : "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20"
                        }
                        variant="outline"
                      >
                        {plan.isActive ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          size="icon"
                          variant="ghost"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && plans.length === 0 && (
                <TableRow>
                  <TableCell
                    className="h-32 text-center text-muted-foreground italic"
                    colSpan={5}
                  >
                    No plans found. Create your first plan to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
