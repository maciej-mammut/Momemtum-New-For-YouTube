"use client"

import * as React from "react"

import { Icon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatPlannedDate } from "@/types/momentum"

const toISODate = (date: Date) => {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  return utc.toISOString()
}

export interface DatePickerFieldProps
  extends Omit<React.ComponentProps<typeof Calendar>, "selected" | "onSelect"> {
  id: string
  label: string
  value?: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  description?: string
  clearLabel?: string
}

export function DatePickerField({
  id,
  label,
  value,
  onChange,
  placeholder = "Select a date",
  description,
  clearLabel = "Clear",
  className,
  ...calendarProps
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const selectedDate = React.useMemo(() => (value ? new Date(value) : null), [value])

  const formattedValue = selectedDate
    ? formatPlannedDate(selectedDate)
    : placeholder

  const handleSelect = (date: Date | null) => {
    if (!date) {
      onChange(null)
      return
    }

    onChange(toISODate(date))
    setOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setOpen(false)
    buttonRef.current?.focus()
  }

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      window.addEventListener("keydown", handleEscape)
      window.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      window.removeEventListener("keydown", handleEscape)
      window.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          id={id}
          ref={buttonRef}
          variant="outline"
          className={cn(
            "w-full justify-between px-3 text-left font-normal",
            !selectedDate && "text-muted-foreground",
          )}
          type="button"
          onClick={() => setOpen((state) => !state)}
        >
          <span className="flex items-center gap-2">
            <Icon name="calendar" className="size-4" />
            {formattedValue}
          </span>
          <Icon name="chevronDown" className="size-4" />
        </Button>
        {value ? (
          <Button variant="ghost" type="button" size="sm" onClick={handleClear}>
            {clearLabel}
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="rounded-lg border bg-background shadow-sm">
          <Calendar
            selected={selectedDate ?? undefined}
            onSelect={handleSelect}
            {...calendarProps}
          />
        </div>
      ) : null}
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
