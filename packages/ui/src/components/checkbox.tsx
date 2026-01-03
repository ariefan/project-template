"use client"

import * as React from "react"
import { Check, Minus } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

interface CheckboxProps
  extends Omit<React.ComponentProps<"button">, "onChange"> {
  checked?: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Checkbox({
  className,
  checked = false,
  indeterminate = false,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const handleClick = () => {
    onCheckedChange?.(!checked)
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      data-state={indeterminate ? "indeterminate" : checked ? "checked" : "unchecked"}
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary",
        "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <span className="flex items-center justify-center text-current">
        {indeterminate ? (
          <Minus className="size-3" />
        ) : checked ? (
          <Check className="size-3" />
        ) : null}
      </span>
    </button>
  )
}

export { Checkbox }
