import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-transparent text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      inputSize: {
        default: "h-9 px-3 py-1",
        sm: "h-8 px-2 py-1 text-sm",
        lg: "h-10 px-4 py-2",
      },
    },
    defaultVariants: {
      inputSize: "default",
    },
  }
)

interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  size?: "default" | "sm" | "lg"
}

function Input({
  className,
  type,
  size,
  inputSize,
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ inputSize: size ?? inputSize, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
export type { InputProps }
