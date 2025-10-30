import * as React from "react"

import { Icon } from "@/components/icons"
import { cn } from "@/lib/utils"

export type CheckboxProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "type"
>

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, disabled, ...props }, ref) => {
    return (
      <span
        className={cn(
          "relative inline-flex h-4 w-4 items-center justify-center",
          disabled && "opacity-60",
        )}
        data-slot="checkbox-wrapper"
      >
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          data-slot="checkbox"
          className={cn(
            "peer size-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-input bg-background text-primary shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60",
            "checked:border-primary checked:bg-primary",
            className,
          )}
          {...props}
        />
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-primary-foreground opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
          data-slot="checkbox-indicator"
        >
          <Icon name="check" className="h-3 w-3" />
        </span>
      </span>
    )
  },
)

Checkbox.displayName = "Checkbox"

export { Checkbox }
