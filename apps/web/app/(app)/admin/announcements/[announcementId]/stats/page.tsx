"use client";

import { useQuery } from "@tanstack/react-query";
import { announcementsGetStatsOptions } from "@workspace/contracts/query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Loader2 } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

export default function AnnouncementStatsPage() {
  const params = useParams<{ announcementId: string }>();
  const { data: activeOrganization } = useActiveOrganization();

  const { data, isLoading } = useQuery({
    ...announcementsGetStatsOptions({
      client: apiClient,
      path: {
        orgId: activeOrganization?.id ?? "",
        announcementId: params.announcementId,
      },
    }),
    enabled: !!activeOrganization?.id && !!params.announcementId,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || "error" in data) {
    return notFound();
  }

  const stats = data.data;

  const chartData = [
    { name: "Views", value: stats.viewCount },
    { name: "Reads", value: stats.readCount },
    { name: "Acks", value: stats.acknowledgeCount },
    { name: "Dismissals", value: stats.dismissCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description="View engagement statistics"
        title="Announcement Statistics"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.viewCount}</div>
            <p className="text-muted-foreground text-xs">
              {stats.viewRate.toFixed(1)}% of audience
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Reads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.readCount}</div>
            <p className="text-muted-foreground text-xs">
              {stats.readRate.toFixed(1)}% of viewers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Acknowledgments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.acknowledgeCount}</div>
            <p className="text-muted-foreground text-xs">
              {stats.acknowledgeRate.toFixed(1)}% of required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Dismissals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.dismissCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  stroke="#888888"
                  tickLine={false}
                />
                <YAxis
                  fontSize={12}
                  stroke="#888888"
                  tickFormatter={(value) => `${value}`}
                  tickLine={false}
                />
                <Bar
                  className="fill-primary"
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
