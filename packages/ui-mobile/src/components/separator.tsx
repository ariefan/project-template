import * as SeparatorPrimitive from "@rn-primitives/separator";
import { cn } from "../lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorPrimitive.RootProps &
  React.RefAttributes<SeparatorPrimitive.RootRef>) {
  return (
    <SeparatorPrimitive.Root
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      decorative={decorative}
      orientation={orientation}
      {...props}
    />
  );
}

export { Separator };
