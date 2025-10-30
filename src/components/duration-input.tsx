"use client"

import * as React from "react"

import { Icon } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface DurationInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  value?: number | null
  onValueChange?: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}

export const DurationInput = React.forwardRef<HTMLInputElement, DurationInputProps>(
  (
    {
      className,
      value,
      onValueChange,
      min = 0,
      max,
      step = 15,
      suffix = "min",
      ...props
    },
    ref,
  ) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value
      if (nextValue === "") {
        onValueChange?.(null)
        return
      }

      const parsed = Number(nextValue)
      if (Number.isNaN(parsed)) {
        onValueChange?.(null)
        return
      }

      onValueChange?.(parsed)
    }

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          onChange={handleChange}
          className={cn("pr-14", className)}
          {...props}
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Icon name="clock" className="size-3.5" />
          <span>{suffix}</span>
        </div>
      </div>
    )
  },
)
DurationInput.displayName = "DurationInput"
