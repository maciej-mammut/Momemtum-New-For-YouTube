import { autoPlan, DEFAULT_AUTOPLAN_SETTINGS } from "@/lib/auto-plan";
import {
  AutoPlanSettings,
  CapacityUsage,
  PlannedTask,
} from "@/types";

export interface TaskStoreState {
  tasks: PlannedTask[];
  settings: AutoPlanSettings;
  capacityUsage: Record<string, CapacityUsage>;
  lastPlannedAt: Date | null;
}

export type TaskStoreListener = (state: TaskStoreState) => void;

export interface TaskStore {
  getState(): TaskStoreState;
  subscribe(listener: TaskStoreListener): () => void;
  loadTasks(tasks: PlannedTask[], today?: Date): void;
  addTask(task: PlannedTask, today?: Date): void;
  updateTask(patch: Partial<PlannedTask> & { id: string }, today?: Date): void;
  removeTask(id: string, today?: Date): void;
  setSettings(settings: Partial<AutoPlanSettings>, today?: Date): void;
  autoPlan(today?: Date): void;
}

const cloneTask = (task: PlannedTask): PlannedTask => ({
  ...task,
  parts: task.parts?.map((part) => ({ ...part })) ?? [],
});

const cloneSettings = (settings: AutoPlanSettings): AutoPlanSettings => ({
  ...settings,
  capacityOverrides: settings.capacityOverrides
    ? { ...settings.capacityOverrides }
    : undefined,
  weekdayCapacities: settings.weekdayCapacities
    ? { ...settings.weekdayCapacities }
    : undefined,
});

const cloneCapacityUsage = (
  usage: Record<string, CapacityUsage>,
): Record<string, CapacityUsage> =>
  Object.fromEntries(
    Object.entries(usage).map(([day, value]) => [day, { ...value }]),
  );

const createSnapshot = (state: TaskStoreState): TaskStoreState => ({
  tasks: state.tasks.map(cloneTask),
  settings: cloneSettings(state.settings),
  capacityUsage: cloneCapacityUsage(state.capacityUsage),
  lastPlannedAt: state.lastPlannedAt ? new Date(state.lastPlannedAt) : null,
});

const mergeSettings = (
  current: AutoPlanSettings,
  patch: Partial<AutoPlanSettings>,
): AutoPlanSettings => ({
  ...current,
  ...patch,
  capacityOverrides: patch.capacityOverrides
    ? { ...current.capacityOverrides, ...patch.capacityOverrides }
    : current.capacityOverrides,
  weekdayCapacities: patch.weekdayCapacities
    ? { ...current.weekdayCapacities, ...patch.weekdayCapacities }
    : current.weekdayCapacities,
});

const mergeTask = (task: PlannedTask, patch: Partial<PlannedTask>): PlannedTask => ({
  ...task,
  ...patch,
  parts: patch.parts ? patch.parts.map((part) => ({ ...part })) : task.parts,
});

export const createTaskStore = (
  initialState: Partial<TaskStoreState> = {},
): TaskStore => {
  let state: TaskStoreState = {
    tasks: initialState.tasks?.map(cloneTask) ?? [],
    settings: initialState.settings
      ? mergeSettings(DEFAULT_AUTOPLAN_SETTINGS, initialState.settings)
      : { ...DEFAULT_AUTOPLAN_SETTINGS },
    capacityUsage: initialState.capacityUsage
      ? cloneCapacityUsage(initialState.capacityUsage)
      : {},
    lastPlannedAt: initialState.lastPlannedAt
      ? new Date(initialState.lastPlannedAt)
      : null,
  };

  const listeners = new Set<TaskStoreListener>();

  const notify = () => {
    const snapshot = createSnapshot(state);
    listeners.forEach((listener) => listener(snapshot));
  };

  const applyAutoPlan = (today: Date | undefined) => {
    const reference = today ?? new Date();
    const { tasks: planned, capacityUsage } = autoPlan(
      state.tasks.map(cloneTask),
      state.settings,
      reference,
    );

    state = {
      ...state,
      tasks: planned,
      capacityUsage,
      lastPlannedAt: reference,
    };
  };

  applyAutoPlan(state.lastPlannedAt ?? undefined);

  return {
    getState: () => createSnapshot(state),
    subscribe: (listener: TaskStoreListener) => {
      listeners.add(listener);
      listener(createSnapshot(state));
      return () => {
        listeners.delete(listener);
      };
    },
    loadTasks: (tasks: PlannedTask[], today?: Date) => {
      state = {
        ...state,
        tasks: tasks.map(cloneTask),
      };
      applyAutoPlan(today);
      notify();
    },
    addTask: (task: PlannedTask, today?: Date) => {
      state = {
        ...state,
        tasks: [...state.tasks, cloneTask(task)],
      };
      applyAutoPlan(today);
      notify();
    },
    updateTask: (patch: Partial<PlannedTask> & { id: string }, today?: Date) => {
      const index = state.tasks.findIndex((task) => task.id === patch.id);
      if (index === -1) {
        return;
      }

      const updatedTasks = state.tasks.slice();
      updatedTasks[index] = mergeTask(updatedTasks[index], patch);
      state = {
        ...state,
        tasks: updatedTasks,
      };
      applyAutoPlan(today);
      notify();
    },
    removeTask: (id: string, today?: Date) => {
      const filtered = state.tasks.filter((task) => task.id !== id);
      if (filtered.length === state.tasks.length) {
        return;
      }

      state = {
        ...state,
        tasks: filtered,
      };
      applyAutoPlan(today);
      notify();
    },
    setSettings: (settings: Partial<AutoPlanSettings>, today?: Date) => {
      state = {
        ...state,
        settings: mergeSettings(state.settings, settings),
      };
      applyAutoPlan(today);
      notify();
    },
    autoPlan: (today?: Date) => {
      applyAutoPlan(today);
      notify();
    },
  };
};
