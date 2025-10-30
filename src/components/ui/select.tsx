import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/icons"

const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, disabled, ...props }, ref) => {
  return (
    <div className={cn("relative inline-flex w-full", disabled && "opacity-60")}
      data-slot="select-wrapper"
    >
      <select
        ref={ref}
        disabled={disabled}
        data-slot="select"
        className={cn(
          "appearance-none border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 flex h-9 w-full min-w-0 items-center rounded-md border bg-transparent px-3 pr-9 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground">
        <Icon name="chevronDown" className="size-4" />
      </span>
    </div>
  )
})
Select.displayName = "Select"

export { Select }
