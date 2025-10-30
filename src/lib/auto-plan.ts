import {
  AutoPlanSettings,
  CapacityUsage,
  PlannedTask,
  Priority,
  Status,
} from "@/types";

export interface AutoPlanResult {
  tasks: PlannedTask[];
  capacityUsage: Record<string, CapacityUsage>;
}

export const DEFAULT_AUTOPLAN_SETTINGS: AutoPlanSettings = {
  dailyCapacityMinutes: 240,
  minChunkMinutes: 30,
  planningHorizonDays: 21,
};

const MAX_AUTOPLAN_HORIZON_DAYS = 21;

const startOfDay = (input: Date): Date => {
  const result = new Date(input);
  result.setHours(0, 0, 0, 0);
  return result;
};

const toDate = (value: string | Date): Date => {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const [year, month, day] = value.split("-").map(Number);
    if (year && month && day) {
      return new Date(year, month - 1, day);
    }
  }

  return parsed;
};

const addDays = (date: Date, amount: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const formatDayKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCapacityForDate = (settings: AutoPlanSettings, date: Date): number => {
  const dayKey = formatDayKey(date);
  const overrideByDate = settings.capacityOverrides?.[dayKey];
  if (overrideByDate !== undefined) {
    return Math.max(0, overrideByDate);
  }

  const weekdayOverride = settings.weekdayCapacities?.[date.getDay()];
  if (weekdayOverride !== undefined) {
    return Math.max(0, weekdayOverride);
  }

  return Math.max(0, settings.dailyCapacityMinutes);
};

const cloneTask = (task: PlannedTask): PlannedTask => ({
  ...task,
  parts: task.parts?.map((part) => ({ ...part })) ?? [],
});

const PRIORITY_RANK: Record<Priority, number> = {
  [Priority.HIGH]: 3, // asap
  [Priority.MEDIUM]: 2, // important
  [Priority.LOW]: 1, // normal
  [Priority.NONE]: 0, // casual
};

const getPriorityRank = (priority: Priority): number => PRIORITY_RANK[priority] ?? 0;

const compareQueueOrder = (left: PlannedTask, right: PlannedTask): number => {
  const leftDeadline = left.dueDate
    ? startOfDay(toDate(left.dueDate)).getTime()
    : Number.POSITIVE_INFINITY;
  const rightDeadline = right.dueDate
    ? startOfDay(toDate(right.dueDate)).getTime()
    : Number.POSITIVE_INFINITY;
  if (leftDeadline !== rightDeadline) {
    return leftDeadline - rightDeadline;
  }

  const priorityWeight = getPriorityRank(right.priority) - getPriorityRank(left.priority);
  if (priorityWeight !== 0) {
    return priorityWeight;
  }

  const leftDuration = left.durationMinutes ?? 0;
  const rightDuration = right.durationMinutes ?? 0;
  if (leftDuration !== rightDuration) {
    return rightDuration - leftDuration;
  }

  const leftCreated = left.createdAt ? new Date(left.createdAt).getTime() : 0;
  const rightCreated = right.createdAt ? new Date(right.createdAt).getTime() : 0;
  if (leftCreated !== rightCreated) {
    return leftCreated - rightCreated;
  }

  return left.id.localeCompare(right.id);
};

const ensureDayEntry = (
  usage: Record<string, CapacityUsage>,
  settings: AutoPlanSettings,
  dayKey: string,
): CapacityUsage => {
  if (!usage[dayKey]) {
    const date = startOfDay(toDate(dayKey));
    const total = getCapacityForDate(settings, date);
    usage[dayKey] = {
      total,
      used: 0,
      remaining: total,
    };
  }

  return usage[dayKey];
};

export const autoPlan = (
  tasks: PlannedTask[],
  settings: AutoPlanSettings,
  referenceToday: Date,
): AutoPlanResult => {
  const sanitizedTasks = tasks.map(cloneTask).map((task) => {
    const normalized: PlannedTask = { ...task };

    if (normalized.plannedDate) {
      normalized.plannedDate = formatDayKey(startOfDay(toDate(normalized.plannedDate)));
    }

    return normalized;
  });

  const today = startOfDay(referenceToday);
  const requestedHorizon = Math.max(1, settings.planningHorizonDays);
  const horizonDays = Math.min(MAX_AUTOPLAN_HORIZON_DAYS, requestedHorizon);
  const horizonEnd = addDays(today, horizonDays - 1);

  const usage: Record<string, CapacityUsage> = {};
  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = addDays(today, offset);
    const dayKey = formatDayKey(date);
    const total = getCapacityForDate(settings, date);
    usage[dayKey] = {
      total,
      used: 0,
      remaining: total,
    };
  }

  const queue: PlannedTask[] = [];
  const queuedIds = new Set<string>();

  sanitizedTasks.forEach((task) => {
    const duration = Math.max(0, task.durationMinutes ?? 0);
    const isComplete = task.status === Status.DONE || task.status === Status.ARCHIVED;

    task.atRisk = false;

    if (isComplete) {
      return;
    }

    const plannedDate = task.plannedDate ? startOfDay(toDate(task.plannedDate)) : null;

    if (plannedDate && plannedDate < today) {
      task.plannedDate = null;
      task.manualPinned = false;
      if (!queuedIds.has(task.id)) {
        queue.push(task);
        queuedIds.add(task.id);
      }
      return;
    }

    if (task.status === Status.BACKLOG && !task.plannedDate) {
      if (!queuedIds.has(task.id)) {
        queue.push(task);
        queuedIds.add(task.id);
      }
      return;
    }

    if (!plannedDate) {
      return;
    }

    if (plannedDate > horizonEnd) {
      return;
    }

    const dayKey = formatDayKey(plannedDate);
    const entry = usage[dayKey] ?? ensureDayEntry(usage, settings, dayKey);
    entry.used += duration;
    entry.remaining = Math.max(0, entry.total - entry.used);
  });

  queue.sort(compareQueueOrder);

  queue.forEach((task, index) => {
    task.orderIndex = index;

    const duration = Math.max(0, task.durationMinutes ?? 0);
    const dueDate = task.dueDate ? startOfDay(toDate(task.dueDate)) : null;

    if (duration === 0) {
      task.plannedDate = formatDayKey(today);
      task.manualPinned = false;
      task.atRisk = Boolean(dueDate && today > dueDate);
      return;
    }

    let assigned = false;
    let assignedAfterDue = false;

    for (let offset = 0; offset < horizonDays; offset += 1) {
      const date = addDays(today, offset);
      const dayKey = formatDayKey(date);
      const entry = usage[dayKey] ?? ensureDayEntry(usage, settings, dayKey);

      if (entry.remaining < duration) {
        continue;
      }

      entry.used += duration;
      entry.remaining = Math.max(0, entry.total - entry.used);
      task.plannedDate = dayKey;
      task.manualPinned = false;
      assigned = true;

      if (dueDate && date > dueDate) {
        assignedAfterDue = true;
      }

      break;
    }

    if (!assigned) {
      task.plannedDate = null;
      task.manualPinned = false;
      task.atRisk = true;
      return;
    }

    task.atRisk = assignedAfterDue;
  });

  Object.values(usage).forEach((entry) => {
    entry.remaining = Math.max(0, entry.total - entry.used);
  });

  return {
    tasks: sanitizedTasks,
    capacityUsage: usage,
  };
};

export type AutoPlan = typeof autoPlan;
