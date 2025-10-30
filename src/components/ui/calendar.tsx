"use client"

import * as React from "react"

import { Icon } from "@/components/icons"
import { cn } from "@/lib/utils"

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
})
const dayFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
})

const toDateKey = (date: Date) => date.toISOString().slice(0, 10)

const addDays = (date: Date, amount: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

const addMonths = (date: Date, amount: number) => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + amount)
  return result
}

const startOfMonth = (date: Date) => {
  const result = new Date(date)
  result.setDate(1)
  result.setHours(0, 0, 0, 0)
  return result
}

const isSameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b)

const getStartOfWeek = (date: Date, weekStartsOn: number) => {
  const day = date.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  return addDays(date, -diff)
}

const buildCalendar = (
  month: Date,
  weekStartsOn: number,
  showOutsideDays: boolean,
) => {
  const firstOfMonth = startOfMonth(month)
  const startDate = getStartOfWeek(firstOfMonth, weekStartsOn)
  const days: Array<{ date: Date; inMonth: boolean }> = []

  for (let index = 0; index < 42; index += 1) {
    const current = addDays(startDate, index)
    const inMonth = current.getMonth() === month.getMonth()
    if (!inMonth && !showOutsideDays) {
      days.push({ date: current, inMonth: false })
    } else {
      days.push({ date: current, inMonth })
    }
  }

  return days
}

export interface CalendarProps
  extends Omit<React.ComponentProps<"div">, "onSelect" | "children"> {
  selected?: Date | Date[] | null
  onSelect?: (value: Date | Date[] | null) => void
  mode?: "single" | "multiple"
  month?: Date
  onMonthChange?: (month: Date) => void
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  showOutsideDays?: boolean
  disabled?: (date: Date) => boolean
  footer?: React.ReactNode
}

export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  (
    {
      className,
      selected,
      onSelect,
      mode = "single",
      month,
      onMonthChange,
      weekStartsOn = 0,
      showOutsideDays = true,
      disabled,
      footer,
      ...props
    },
    ref,
  ) => {
    const selectedDates = React.useMemo(() => {
      if (selected == null) return []
      return Array.isArray(selected) ? selected : [selected]
    }, [selected])

    const now = React.useMemo(() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return today
    }, [])

    const [internalMonth, setInternalMonth] = React.useState<Date>(() => {
      if (month) return startOfMonth(month)
      if (selectedDates.length) return startOfMonth(selectedDates[0])
      return startOfMonth(new Date())
    })

    const currentMonth = month ? startOfMonth(month) : internalMonth

    React.useEffect(() => {
      if (month) {
        setInternalMonth(startOfMonth(month))
      }
    }, [month])

    const handleMonthChange = (next: Date) => {
      const normalized = startOfMonth(next)
      if (!month) {
        setInternalMonth(normalized)
      }
      onMonthChange?.(normalized)
    }

    const days = React.useMemo(
      () => buildCalendar(currentMonth, weekStartsOn, showOutsideDays),
      [currentMonth, weekStartsOn, showOutsideDays],
    )

    const handleSelect = (date: Date) => {
      if (disabled?.(date)) {
        return
      }

      if (mode === "single") {
        onSelect?.(date)
        return
      }

      const exists = selectedDates.some((item) => isSameDay(item, date))
      if (exists) {
        const next = selectedDates.filter((item) => !isSameDay(item, date))
        onSelect?.(next.length ? next : null)
      } else {
        onSelect?.([...selectedDates, date])
      }
    }

    return (
      <div
        ref={ref}
        className={cn("w-full space-y-3", className)}
        {...props}
      >
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border border-transparent bg-muted text-muted-foreground transition hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => handleMonthChange(addMonths(currentMonth, -1))}
            aria-label="Previous month"
          >
            <Icon name="chevronLeft" className="size-4" />
          </button>
          <div className="text-sm font-semibold text-foreground">
            {monthFormatter.format(currentMonth)}
          </div>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border border-transparent bg-muted text-muted-foreground transition hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => handleMonthChange(addMonths(currentMonth, 1))}
            aria-label="Next month"
          >
            <Icon name="chevronRight" className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 px-2 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((label, index) => {
            const labelIndex = (index + weekStartsOn) % 7
            return (
              <span key={label} className="uppercase">
                {WEEKDAY_LABELS[labelIndex]}
              </span>
            )
          })}
        </div>
        <div className="grid grid-cols-7 gap-1 p-2">
          {days.map(({ date, inMonth }) => {
            const isToday = isSameDay(date, now)
            const isSelected = selectedDates.some((item) => isSameDay(item, date))
            const isDisabled = Boolean(disabled?.(date))

            if (!inMonth && !showOutsideDays) {
              return <span key={toDateKey(date)} />
            }

            return (
              <button
                key={toDateKey(date)}
                type="button"
                onClick={() => handleSelect(date)}
                disabled={isDisabled}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-md text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !inMonth && "text-muted-foreground/60",
                  isSelected && "bg-primary text-primary-foreground shadow-sm",
                  !isSelected && !isDisabled && "hover:bg-muted",
                  isDisabled && "cursor-not-allowed opacity-40",
                  isToday && !isSelected && "border border-primary/30",
                )}
              >
                <time dateTime={toDateKey(date)}>{dayFormatter.format(date)}</time>
                {isToday ? (
                  <span className="sr-only">Today</span>
                ) : null}
              </button>
            )
          })}
        </div>
        {footer ? <div className="px-2 pb-2 text-xs text-muted-foreground">{footer}</div> : null}
      </div>
    )
  },
)
Calendar.displayName = "Calendar"
