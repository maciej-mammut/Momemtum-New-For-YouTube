/**
 * Core Momentum domain types and helpers shared across the application.
 */

/**
 * Priority levels available to a task.
 *
 * The default priority applied during quick capture is {@link Priority.MEDIUM}.
 */
export enum Priority {
  NONE = "none",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

/**
 * Task lifecycle states. Most workflows begin in {@link Status.BACKLOG}
 * and progress through to {@link Status.DONE}. Items are only removed from
 * user-facing views once they enter {@link Status.ARCHIVED}.
 */
export enum Status {
  BACKLOG = "backlog",
  ACTIVE = "active",
  BLOCKED = "blocked",
  DONE = "done",
  ARCHIVED = "archived",
}

export type WeekdayName =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const WEEKDAY_SEQUENCE: WeekdayName[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const WEEKDAY_LABELS: Record<WeekdayName, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const WEEKDAY_SHORT_LABELS: Record<WeekdayName, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export const WEEKDAY_TO_INDEX: Record<WeekdayName, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export interface WorkingHoursEntry {
  enabled: boolean;
  startHour: number;
  durationHours: number;
}

export type WeeklyWorkingHours = Record<WeekdayName, WorkingHoursEntry>;

/**
 * Known scheduling horizons used when grouping tasks by planned date.
 */
export type TimeHorizon =
  | "unscheduled"
  | "overdue"
  | "today"
  | "tomorrow"
  | "thisWeek"
  | "later";

/**
 * User-configurable preferences that influence how Momentum behaves.
 *
 * These values should be persisted and respected across all interactive views.
 */
export interface UserSettings {
  /** Default priority assigned to newly created tasks when none is specified. */
  defaultPriority: Priority;
  /** Preferred time zone identifier, e.g. `America/New_York`. */
  timeZone: string;
  /** How the planned date should be formatted for display (Intl pattern). */
  dateFormat: Intl.DateTimeFormatOptions;
  /** Number of days shown in the "This Week" horizon grouping. */
  weekSpan: number;
  /** Number of days to keep completed items visible before auto-archiving. */
  completionGracePeriod: number;
  /** Typical working hours for each weekday. */
  workingHours: WeeklyWorkingHours;
  /** Derived minutes of capacity for each weekday (0 = Sunday). */
  weekdayCapacityMinutes: Partial<Record<number, number>>;
}

export const DEFAULT_WORKING_HOURS: WeeklyWorkingHours = {
  monday: { enabled: true, startHour: 9, durationHours: 8 },
  tuesday: { enabled: true, startHour: 9, durationHours: 8 },
  wednesday: { enabled: true, startHour: 9, durationHours: 8 },
  thursday: { enabled: true, startHour: 9, durationHours: 8 },
  friday: { enabled: true, startHour: 9, durationHours: 6 },
  saturday: { enabled: false, startHour: 9, durationHours: 0 },
  sunday: { enabled: false, startHour: 9, durationHours: 0 },
};

export const computeWeekdayCapacityMinutes = (
  workingHours: WeeklyWorkingHours,
): Partial<Record<number, number>> => {
  const capacities: Partial<Record<number, number>> = {};

  WEEKDAY_SEQUENCE.forEach((day) => {
    const entry = workingHours[day];
    if (!entry) return;

    const minutes = entry.enabled
      ? Math.max(0, Math.round(entry.durationHours * 60))
      : 0;

    capacities[WEEKDAY_TO_INDEX[day]] = minutes;
  });

  return capacities;
};

/**
 * Lightweight task representation shared between server and client logic.
 *
 * All timestamps are stored as ISO-8601 strings. Optional fields default to `null`
 * unless otherwise noted.
 */
export interface Task {
  /** Stable identifier used for updates. */
  id: string;
  /** Short descriptive title rendered in task lists. */
  title: string;
  /** Long-form notes or context shown in detail panes. */
  notes?: string | null;
  /** Priority flag, defaults to {@link Priority.MEDIUM}. */
  priority: Priority;
  /** Lifecycle status, defaults to {@link Status.BACKLOG}. */
  status: Status;
  /** ISO string indicating when the task was created. */
  createdAt: string;
  /** ISO string for when the task was last updated. */
  updatedAt?: string | null;
  /** Planned completion date as an ISO string. */
  plannedDate?: string | null;
  /** Indicates whether the task was explicitly pinned by the user. */
  manualPinned?: boolean | null;
  /** Zero-based index representing manual ordering within a column. */
  orderIndex?: number | null;
  /** Marks the task as at-risk of missing commitments. */
  atRisk?: boolean | null;
  /** Date the task moved to {@link Status.DONE}. */
  completedAt?: string | null;
  /** Optional labels/tags applied by the user. */
  tags?: string[];
}

/**
 * Individual timeboxed portion of a task's schedule.
 */
export interface TaskPart {
  /** Unique identifier for this slice of work. */
  id: string;
  /** Identifier of the parent task. */
  taskId: string;
  /** Sequential index relative to the rest of the task's parts. */
  sequence: number;
  /** ISO-8601 date string (YYYY-MM-DD) representing the scheduled day. */
  plannedDate: string;
  /** Planned duration in minutes. */
  durationMinutes: number;
  /** True when the part is anchored by an explicit pin. */
  isPinned?: boolean;
  /** Indicates whether the part was created by the auto-planner. */
  isAutoGenerated: boolean;
}

/**
 * Extended task shape used by the auto-planner.
 */
export interface PlannedTask extends Task {
  /** Target date the task should be completed by. */
  dueDate?: string | null;
  /** Total amount of focused work remaining, in minutes. */
  durationMinutes: number;
  /** Optional user pin anchoring the task to a specific day. */
  pinnedDate?: string | null;
  /** Optional manual ordering hint supplied by the user. */
  manualOrder?: number | null;
  /** Schedule parts combining manual entries and generated slices. */
  parts?: TaskPart[];
}

/**
 * User configurable inputs leveraged by the auto-planner.
 */
export interface AutoPlanSettings {
  /** Total focus minutes available on a typical day. */
  dailyCapacityMinutes: number;
  /** Minimum contiguous block size the planner should allocate. */
  minChunkMinutes: number;
  /** Number of calendar days to look ahead when scheduling. */
  planningHorizonDays: number;
  /** Optional ISO date overrides for capacity (YYYY-MM-DD). */
  capacityOverrides?: Record<string, number>;
  /** Optional per-weekday capacity overrides (0 = Sunday). */
  weekdayCapacities?: Partial<Record<number, number>>;
}

/**
 * Aggregated focus usage per day returned from the auto-planner.
 */
export interface CapacityUsage {
  /** Total focus minutes available. */
  total: number;
  /** Minutes already reserved for planned work. */
  used: number;
  /** Remaining focus capacity (never negative). */
  remaining: number;
}

/**
 * Default user preferences used when no stored configuration is available.
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultPriority: Priority.MEDIUM,
  timeZone: "UTC",
  dateFormat: { month: "short", day: "numeric" },
  weekSpan: 7,
  completionGracePeriod: 3,
  workingHours: DEFAULT_WORKING_HOURS,
  weekdayCapacityMinutes: computeWeekdayCapacityMinutes(DEFAULT_WORKING_HOURS),
};

/**
 * Priority weights used when calculating agenda ordering or focus suggestions.
 */
export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  [Priority.NONE]: 0,
  [Priority.LOW]: 1,
  [Priority.MEDIUM]: 5,
  [Priority.HIGH]: 10,
};

/**
 * Human-readable labels matching the {@link Priority} enum.
 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.NONE]: "No priority",
  [Priority.LOW]: "Low",
  [Priority.MEDIUM]: "Medium",
  [Priority.HIGH]: "High",
};

const MS_IN_DAY = 86_400_000;

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const toDate = (value: string | Date): Date =>
  value instanceof Date ? value : new Date(value);

/**
 * Determine which scheduling bucket a planned date falls into relative to a reference date.
 */
export const getTimeHorizon = (
  planned: string | Date | null | undefined,
  reference: Date = new Date(),
  options: { weekSpan?: number } = {},
): TimeHorizon => {
  if (!planned) return "unscheduled";

  const horizonSpan = options.weekSpan ?? DEFAULT_USER_SETTINGS.weekSpan;
  const refDay = startOfDay(reference);
  const plannedDay = startOfDay(toDate(planned));

  const diff = Math.round((plannedDay.getTime() - refDay.getTime()) / MS_IN_DAY);

  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff < horizonSpan) return "thisWeek";
  return "later";
};

/**
 * Order in which time horizons should be displayed in UI groupings.
 */
export const TIME_HORIZON_ORDER: TimeHorizon[] = [
  "overdue",
  "today",
  "tomorrow",
  "thisWeek",
  "later",
  "unscheduled",
];

/**
 * Utility to format a planned date using {@link UserSettings.dateFormat} defaults.
 *
 * Returns an empty string when no date is available.
 */
export const formatPlannedDate = (
  planned: string | Date | null | undefined,
  locale: string = "default",
  format: Intl.DateTimeFormatOptions = DEFAULT_USER_SETTINGS.dateFormat,
  timeZone: string = DEFAULT_USER_SETTINGS.timeZone,
): string => {
  if (!planned) return "";

  const date = toDate(planned);
  return new Intl.DateTimeFormat(locale, { ...format, timeZone }).format(date);
};

/**
 * Convenience predicate for checking whether a task is complete.
 */
export const isTaskComplete = (task: Task): boolean => task.status === Status.DONE;

/**
 * Convenience predicate for checking whether a task should be auto-archived
 * based on {@link UserSettings.completionGracePeriod}.
 */
export const shouldAutoArchive = (
  task: Task,
  settings: UserSettings = DEFAULT_USER_SETTINGS,
  reference: Date = new Date(),
): boolean => {
  if (task.status !== Status.DONE || !task.completedAt) {
    return false;
  }

  const completedDay = startOfDay(toDate(task.completedAt));
  const refDay = startOfDay(reference);
  const diff = Math.round((refDay.getTime() - completedDay.getTime()) / MS_IN_DAY);
  return diff >= settings.completionGracePeriod;
};
