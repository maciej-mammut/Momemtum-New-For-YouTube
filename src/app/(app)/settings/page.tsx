"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  clearSession,
  runAutoPlan,
  setAutoPlanEnabled,
  updateSettings,
  useMomentumSelectors,
} from "@/lib/momentum-store"
import {
  Priority,
  PRIORITY_LABELS,
  WEEKDAY_LABELS,
  WEEKDAY_SEQUENCE,
  WEEKDAY_SHORT_LABELS,
  WeekdayName,
  WorkingHoursEntry,
} from "@/types/momentum"

const WEEK_SPAN_RANGE = { min: 3, max: 21 }
const COMPLETION_GRACE_RANGE = { min: 0, max: 30 }

const WORKING_DAY_CONFIG = WEEKDAY_SEQUENCE.map((day) => ({
  key: day,
  label: WEEKDAY_LABELS[day],
  shortLabel: WEEKDAY_SHORT_LABELS[day],
}))

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index)

const formatHourLabel = (hour: number): string => {
  const normalized = ((hour % 24) + 24) % 24
  const suffix = normalized >= 12 ? "PM" : "AM"
  const display = normalized % 12 || 12
  return `${display} ${suffix}`
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value))
}

export default function SettingsPage() {
  const router = useRouter()
  const [session, settings, autoPlanEnabled] = useMomentumSelectors([
    (state) => state.session,
    (state) => state.settings,
    (state) => state.autoPlanEnabled,
  ])
  const signOutRedirectRef = useRef(false)

  useEffect(() => {
    if (!session.isAuthenticated && !signOutRedirectRef.current) {
      router.replace("/auth")
    }
  }, [router, session.isAuthenticated])

  const priorityOptions = useMemo(
    () => Object.entries(PRIORITY_LABELS) as Array<[Priority, string]>,
    [],
  )

  const handleSignOut = useCallback(() => {
    signOutRedirectRef.current = true
    clearSession()
    router.replace("/")
  }, [router])

  const handleWorkingHoursChange = useCallback(
    (day: WeekdayName, patch: Partial<WorkingHoursEntry>) => {
      const currentEntry = settings.workingHours[day]
      if (!currentEntry) return

      const nextEntry = { ...currentEntry, ...patch }
      if (
        nextEntry.enabled === currentEntry.enabled &&
        nextEntry.startHour === currentEntry.startHour &&
        nextEntry.durationHours === currentEntry.durationHours
      ) {
        return
      }

      updateSettings({
        workingHours: {
          [day]: nextEntry,
        } as Partial<Record<WeekdayName, WorkingHoursEntry>>,
      })
    },
    [settings.workingHours],
  )

  const handleDayToggle = useCallback(
    (day: WeekdayName, enabled: boolean) => {
      handleWorkingHoursChange(day, { enabled })
    },
    [handleWorkingHoursChange],
  )

  const handleStartHourChange = useCallback(
    (day: WeekdayName, value: number) => {
      if (Number.isNaN(value)) return
      handleWorkingHoursChange(day, { startHour: value })
    },
    [handleWorkingHoursChange],
  )

  const handleDurationChange = useCallback(
    (day: WeekdayName, value: number) => {
      if (Number.isNaN(value)) return
      handleWorkingHoursChange(day, { durationHours: value })
    },
    [handleWorkingHoursChange],
  )

  const handleApplyWeekdays = useCallback(() => {
    const monday = settings.workingHours.monday
    if (!monday) return

    const patch: Partial<Record<WeekdayName, WorkingHoursEntry>> = {
      tuesday: { ...monday },
      wednesday: { ...monday },
      thursday: { ...monday },
      friday: { ...monday },
    }

    updateSettings({ workingHours: patch })
  }, [settings.workingHours])

  if (!session.isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-background/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Settings</p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Planner preferences
            </h1>
            <p className="text-sm text-muted-foreground">
              Tune how Momentum schedules work and what happens after tasks are
              completed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-sm sm:flex">
              <span className="font-medium text-foreground">
                {session.displayName || session.userId || "Momentum Explorer"}
              </span>
            </div>
            <Button type="button" variant="ghost" asChild>
              <Link href="/app" className="gap-2">
                Back to dashboard
              </Link>
            </Button>
            <Button type="button" variant="ghost" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <Card className="border-border/60 bg-background/70">
        <CardHeader>
          <CardTitle>Scheduling defaults</CardTitle>
          <CardDescription>
            Configure default priority, capacity horizons, and auto-archive
            behaviour.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default-priority">Default priority</Label>
              <Select
                id="default-priority"
                value={settings.defaultPriority}
                onChange={(event) => {
                  const nextPriority = event.target.value as Priority
                  if (nextPriority === settings.defaultPriority) return
                  updateSettings({ defaultPriority: nextPriority })
                }}
              >
                {priorityOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Applied to new quick-add tasks without an explicit priority.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-zone">Time zone</Label>
              <Input
                id="time-zone"
                value={settings.timeZone}
                onChange={(event) => {
                  const nextTimeZone = event.target.value
                  if (nextTimeZone === settings.timeZone) return
                  updateSettings({ timeZone: nextTimeZone })
                }}
                placeholder="e.g. America/New_York"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Used when formatting planned dates and auto-plan schedules.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="week-span">Week horizon (days)</Label>
              <Input
                id="week-span"
                type="number"
                min={WEEK_SPAN_RANGE.min}
                max={WEEK_SPAN_RANGE.max}
                value={settings.weekSpan}
                onChange={(event) => {
                  const value = Number.parseInt(event.target.value, 10)
                  if (Number.isNaN(value)) return
                  const nextWeekSpan = clamp(
                    value,
                    WEEK_SPAN_RANGE.min,
                    WEEK_SPAN_RANGE.max,
                  )
                  if (nextWeekSpan === settings.weekSpan) return
                  updateSettings({ weekSpan: nextWeekSpan })
                }}
                aria-describedby="week-span-hint"
              />
              <p
                id="week-span-hint"
                className="text-xs text-muted-foreground"
              >
                Determines how many future days appear in the “This Week”
                grouping.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="completion-grace">Completion grace period</Label>
              <Input
                id="completion-grace"
                type="number"
                min={COMPLETION_GRACE_RANGE.min}
                max={COMPLETION_GRACE_RANGE.max}
                value={settings.completionGracePeriod}
                onChange={(event) => {
                  const value = Number.parseInt(event.target.value, 10)
                  if (Number.isNaN(value)) return
                  const nextGrace = clamp(
                    value,
                    COMPLETION_GRACE_RANGE.min,
                    COMPLETION_GRACE_RANGE.max,
                  )
                  if (nextGrace === settings.completionGracePeriod) return
                  updateSettings({ completionGracePeriod: nextGrace })
                }}
                aria-describedby="completion-grace-hint"
              />
              <p
                id="completion-grace-hint"
                className="text-xs text-muted-foreground"
              >
                Number of days completed tasks remain visible before
                auto-archiving.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Working schedule</h2>
                <p className="text-xs text-muted-foreground">
                  Choose when you typically have focus time. Auto-plan uses these hours to
                  determine daily capacity.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyWeekdays}
              >
                Apply to all weekdays
              </Button>
            </div>
            <div className="grid gap-3">
              {WORKING_DAY_CONFIG.map((day) => {
                const daySchedule = settings.workingHours[day.key]
                const startId = `working-${day.key}-start`
                const hoursId = `working-${day.key}-hours`
                const minutesAvailable = daySchedule.enabled
                  ? Math.max(0, Math.round(daySchedule.durationHours * 60))
                  : 0

                return (
                  <div
                    key={day.key}
                    className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`working-${day.key}-enabled`}
                        checked={daySchedule.enabled}
                        onChange={(event) =>
                          handleDayToggle(day.key, event.currentTarget.checked)
                        }
                        aria-label={`Toggle ${day.label} availability`}
                      />
                      <Label
                        htmlFor={`working-${day.key}-enabled`}
                        className="text-sm font-medium text-foreground"
                      >
                        {day.label}
                      </Label>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={startId}
                          className="text-xs font-medium uppercase text-muted-foreground"
                        >
                          Start
                        </Label>
                        <Select
                          id={startId}
                          value={String(daySchedule.startHour)}
                          onChange={(event) =>
                            handleStartHourChange(
                              day.key,
                              Number.parseInt(event.target.value, 10),
                            )
                          }
                          disabled={!daySchedule.enabled}
                        >
                          {HOUR_OPTIONS.map((hour) => (
                            <option key={hour} value={hour}>
                              {formatHourLabel(hour)}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={hoursId}
                          className="text-xs font-medium uppercase text-muted-foreground"
                        >
                          Hours
                        </Label>
                        <Input
                          id={hoursId}
                          type="number"
                          min={0}
                          max={16}
                          step={0.5}
                          value={daySchedule.durationHours}
                          onChange={(event) =>
                            handleDurationChange(day.key, event.target.valueAsNumber)
                          }
                          disabled={!daySchedule.enabled}
                          className="w-20"
                          inputMode="decimal"
                        />
                        <span className="text-xs text-muted-foreground">
                          {minutesAvailable} min
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">
                Auto-plan scheduling
              </h2>
              <p className="text-xs text-muted-foreground">
                Automatically distribute planned work when tasks or settings
                change.
              </p>
            </div>
            <Switch
              checked={autoPlanEnabled}
              onCheckedChange={(checked) => setAutoPlanEnabled(checked)}
              aria-label="Toggle auto-plan"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Tip: you can rerun the planner at any time to rebuild the schedule.
          </p>
          <Button
            type="button"
            onClick={() => runAutoPlan()}
            className="gap-2"
          >
            Re-run Auto-Plan now
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
