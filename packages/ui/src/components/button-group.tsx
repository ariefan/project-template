import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const buttonGroupVariants = cva(
  "inline-flex items-center rounded-md",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
      },
      size: {
        default: "",
        sm: "",
        lg: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonGroupProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof buttonGroupVariants> {}

function ButtonGroup({ className, variant, size, ...props }: ButtonGroupProps) {
  return (
    <div
      data-slot="button-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        buttonGroupVariants({ variant, size }),
        "[&>button]:rounded-none [&>button]:border-r-0 last:[&>button]:border-r",
        "[&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md",
        "[&>button:focus-visible]:z-10 [&>button:hover]:z-10",
        className
      )}
      {...props}
    />
  )
}

export { ButtonGroup, buttonGroupVariants }
