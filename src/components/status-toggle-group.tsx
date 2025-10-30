"use client"

import * as React from "react"

import { Icon } from "@/components/icons"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { Status } from "@/types/momentum"

const STATUS_ORDER: Status[] = [
  Status.BACKLOG,
  Status.ACTIVE,
  Status.BLOCKED,
  Status.DONE,
]

const STATUS_LABELS: Record<Exclude<Status, Status.ARCHIVED>, string> = {
  [Status.BACKLOG]: "Backlog",
  [Status.ACTIVE]: "Active",
  [Status.BLOCKED]: "Blocked",
  [Status.DONE]: "Done",
}

const STATUS_ICONS: Record<Exclude<Status, Status.ARCHIVED>, string> = {
  [Status.BACKLOG]: "circle",
  [Status.ACTIVE]: "arrowRight",
  [Status.BLOCKED]: "octagonX",
  [Status.DONE]: "checkCircle",
}

export interface StatusToggleGroupProps
  extends Omit<React.ComponentProps<typeof ToggleGroup>, "type" | "value" | "onValueChange"> {
  value: Status
  onValueChange?: (status: Status) => void
}

export function StatusToggleGroup({
  value,
  onValueChange,
  className,
  ...props
}: StatusToggleGroupProps) {
  const handleValueChange = (next: string | string[] | null) => {
    if (typeof next === "string") {
      onValueChange?.(next as Status)
    } else if (Array.isArray(next) && next.length) {
      onValueChange?.(next[0] as Status)
    }
  }

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={handleValueChange}
      className={cn("w-full justify-between", className)}
      {...props}
    >
      {STATUS_ORDER.map((status) => (
        <ToggleGroupItem
          key={status}
          value={status}
          className="flex-1 gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Icon name={STATUS_ICONS[status]} className="size-4" />
          <span>{STATUS_LABELS[status]}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
