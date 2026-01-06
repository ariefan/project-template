import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

export interface Stat {
  label: string;
  value: string | number;
  trend?: {
    value: string | number;
    direction: "up" | "down";
  };
  footer?: {
    label: string;
    description?: string;
  };
  icon?: LucideIcon;
}

interface StatsGridProps {
  stats: Stat[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs md:grid-cols-2 xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  let TrendIcon: LucideIcon | null = null;
  if (stat.trend) {
    TrendIcon = stat.trend.direction === "up" ? TrendingUp : TrendingDown;
  }

  const Icon = stat.icon;

  return (
    <Card className="@container/card" data-slot="card">
      <CardHeader className="relative">
        {Icon && (
          <div className="absolute top-2 right-2">
            <Icon className="size-14 text-muted-foreground/50" />
          </div>
        )}
        <CardDescription>{stat.label}</CardDescription>
        <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
          {stat.value}
        </CardTitle>
        {stat.trend && TrendIcon && (
          <Badge className="mt-2" variant="outline">
            <TrendIcon className="size-3" />
            {stat.trend.value}
          </Badge>
        )}
      </CardHeader>
      {stat.footer && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stat.footer.label}
            {TrendIcon && <TrendIcon className="size-4" />}
          </div>
          {stat.footer.description && (
            <div className="text-muted-foreground">
              {stat.footer.description}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
