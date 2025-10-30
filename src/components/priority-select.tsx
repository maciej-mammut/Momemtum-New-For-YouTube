"use client"

import * as React from "react"

import { Icon } from "@/components/icons"
import { Select } from "@/components/ui/select"
import { PRIORITY_LABELS, Priority } from "@/types/momentum"

const priorityOrder: Priority[] = [
  Priority.HIGH,
  Priority.MEDIUM,
  Priority.LOW,
  Priority.NONE,
]

export interface PrioritySelectProps
  extends Omit<React.ComponentProps<typeof Select>, "value" | "onChange"> {
  value: Priority
  onValueChange?: (priority: Priority) => void
  includeNoneOption?: boolean
}

export function PrioritySelect({
  value,
  onValueChange,
  includeNoneOption = true,
  className,
  ...props
}: PrioritySelectProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onValueChange?.(event.target.value as Priority)
  }

  const options = includeNoneOption
    ? priorityOrder
    : priorityOrder.filter((priority) => priority !== Priority.NONE)

  return (
    <Select value={value} onChange={handleChange} className={className} {...props}>
      {options.map((priority) => (
        <option key={priority} value={priority} className="flex items-center gap-2">
          {PRIORITY_LABELS[priority]}
        </option>
      ))}
    </Select>
  )
}

export const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const iconName = priority === Priority.HIGH ? "sparkles" : priority === Priority.NONE ? "circle" : "arrowRight"

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon name={iconName} className="size-3" />
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
