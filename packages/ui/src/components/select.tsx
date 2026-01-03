"use client"

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const selectTriggerVariants = cva(
  "flex items-center justify-between gap-2 rounded-md border border-input bg-transparent shadow-xs transition-colors focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate",
  {
    variants: {
      size: {
        default: "h-9 px-3 py-1 text-sm",
        sm: "h-8 px-2 py-1 text-sm",
        lg: "h-10 px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends VariantProps<typeof selectTriggerVariants> {
  value?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  className,
  size,
  disabled,
}: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        data-slot="select-trigger"
        className={cn(selectTriggerVariants({ size }), "w-full")}
        onClick={() => setOpen(!open)}
      >
        <span className={cn(!selectedOption && "text-muted-foreground")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div
          role="listbox"
          data-slot="select-content"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {options.map((option) => (
            <button
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              disabled={option.disabled}
              data-slot="select-item"
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                "disabled:pointer-events-none disabled:opacity-50",
                value === option.value && "bg-accent"
              )}
              onClick={() => {
                onValueChange?.(option.value)
                setOpen(false)
              }}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center",
                  value !== option.value && "opacity-0"
                )}
              >
                <Check className="size-4" />
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { Select, selectTriggerVariants }
export type { SelectOption, SelectProps }
