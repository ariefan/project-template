import { cn } from "@workspace/ui/lib/utils";

interface StatsProps {
  className?: string;
}

const stats = [
  {
    value: "10K+",
    label: "Active Users",
    description: "Trust our platform",
  },
  {
    value: "99.9%",
    label: "Uptime",
    description: "Guaranteed reliability",
  },
  {
    value: "1M+",
    label: "Transactions",
    description: "Processed monthly",
  },
  {
    value: "50+",
    label: "Countries",
    description: "Worldwide coverage",
  },
];

export function Stats({ className }: StatsProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-border/40 border-y bg-muted/30 py-16 sm:py-24",
        className
      )}
      id="stats"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div className="text-center" key={stat.label}>
              <div className="font-bold text-4xl tracking-tight sm:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 font-semibold text-base text-foreground">
                {stat.label}
              </div>
              <div className="mt-1 text-muted-foreground text-sm">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
