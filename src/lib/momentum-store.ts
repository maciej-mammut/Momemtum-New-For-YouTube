import { useMemo, useSyncExternalStore } from "react";

import {
  DEFAULT_USER_SETTINGS,
  Priority,
  Status,
  Task,
  UserSettings,
  getTimeHorizon,
} from "@/types/momentum";

import { loadJSON, saveJSON } from "./storage";

type Listener = () => void;

const STORAGE_KEY = "momentum/state";

export interface SessionInfo {
  userId: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  expiresAt: string | null;
}

export interface MomentumState {
  tasks: Task[];
  settings: UserSettings;
  focusMode: FocusModeState;
  autoPlanEnabled: boolean;
  session: SessionInfo;
}

export interface FocusModeState {
  enabled: boolean;
  activeTaskId: string | null;
  queue: string[];
}

interface PersistedMomentumState {
  tasks: Task[];
  settings: UserSettings;
  focusMode: boolean | FocusModeState;
  autoPlanEnabled: boolean;
  session?: SessionInfo;
}

type AutoPlanCallback = (state: MomentumState) => void;

type StateUpdater =
  | Partial<MomentumState>
  | ((state: MomentumState) => Partial<MomentumState>);

interface SetStateOptions {
  persist?: boolean;
  skipAutoPlan?: boolean;
}

const createId = (): string => {
  const cryptoApi =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & { crypto?: Crypto }).crypto
      : undefined;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return Math.random().toString(36).slice(2);
};

const createDefaultSession = (): SessionInfo => ({
  userId: null,
  displayName: null,
  isAuthenticated: false,
  expiresAt: null,
});

const createFocusModeState = (
  base: Partial<FocusModeState> = {},
): FocusModeState => {
  const enabled = base.enabled ?? false;
  const queue = Array.isArray(base.queue) ? [...base.queue] : [];

  return {
    enabled,
    activeTaskId: enabled ? base.activeTaskId ?? null : null,
    queue: enabled ? queue : [],
  };
};

const computeFocusQueue = (
  tasks: Task[],
  settings: UserSettings,
): string[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return tasks
    .filter((task) => {
      if (task.status === Status.DONE || task.status === Status.ARCHIVED) {
        return false;
      }

      if (!task.plannedDate) {
        return false;
      }

      return (
        getTimeHorizon(task.plannedDate, today, {
          weekSpan: settings.weekSpan,
        }) === "today"
      );
    })
    .sort((a, b) => {
      const pinWeight = Number(Boolean(b.manualPinned)) - Number(Boolean(a.manualPinned));
      if (pinWeight !== 0) return pinWeight;

      const plannedA = a.plannedDate ? new Date(a.plannedDate).getTime() : 0;
      const plannedB = b.plannedDate ? new Date(b.plannedDate).getTime() : 0;
      if (plannedA !== plannedB) return plannedA - plannedB;

      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdA - createdB;
    })
    .map((task) => task.id);
};

const mergeQueueOrder = (
  currentQueue: string[],
  computedQueue: string[],
): string[] => {
  const available = new Set(computedQueue);
  const seen = new Set<string>();
  const merged: string[] = [];

  currentQueue.forEach((id) => {
    if (!available.has(id) || seen.has(id)) {
      return;
    }

    merged.push(id);
    seen.add(id);
  });

  computedQueue.forEach((id) => {
    if (seen.has(id)) {
      return;
    }

    merged.push(id);
    seen.add(id);
  });

  return merged;
};

const reconcileFocusModeState = (
  _previous: MomentumState,
  next: MomentumState,
): FocusModeState => {
  const normalized = createFocusModeState(next.focusMode);

  if (!normalized.enabled) {
    return normalized;
  }

  const computedQueue = computeFocusQueue(next.tasks, next.settings);
  const mergedQueue = mergeQueueOrder(normalized.queue, computedQueue);

  let activeTaskId = normalized.activeTaskId;
  if (!activeTaskId || !mergedQueue.includes(activeTaskId)) {
    activeTaskId = mergedQueue[0] ?? null;
  }

  return {
    enabled: true,
    activeTaskId,
    queue: mergedQueue,
  };
};

const createDefaultState = (): MomentumState => ({
  tasks: [],
  settings: { ...DEFAULT_USER_SETTINGS },
  focusMode: createFocusModeState(),
  autoPlanEnabled: true,
  session: createDefaultSession(),
});

const hydrateState = (): MomentumState => {
  const persisted = loadJSON<PersistedMomentumState | null>(STORAGE_KEY, null);

  if (!persisted) {
    return createDefaultState();
  }

  const {
    session: persistedSession,
    focusMode: persistedFocusMode,
    settings: persistedSettings,
    ...rest
  } = persisted;

  const base: MomentumState = {
    ...createDefaultState(),
    ...rest,
    settings: { ...DEFAULT_USER_SETTINGS, ...persistedSettings },
    focusMode: createFocusModeState(
      typeof persistedFocusMode === "boolean"
        ? { enabled: persistedFocusMode }
        : persistedFocusMode ?? {},
    ),
  };

  return {
    ...base,
    focusMode: reconcileFocusModeState(base, base),
    session: persistedSession
      ? { ...createDefaultSession(), ...persistedSession }
      : createDefaultSession(),
  };
};

let state: MomentumState = hydrateState();

const listeners = new Set<Listener>();
let autoPlanCallback: AutoPlanCallback | null = null;

const persistState = (value: MomentumState): void => {
  const snapshot: PersistedMomentumState = {
    tasks: value.tasks,
    settings: value.settings,
    focusMode: value.focusMode,
    autoPlanEnabled: value.autoPlanEnabled,
    session: value.session,
  };
  saveJSON(STORAGE_KEY, snapshot);
};

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

const maybeRunAutoPlan = (
  prev: MomentumState,
  next: MomentumState,
  patch: Partial<MomentumState>,
  options?: SetStateOptions,
): void => {
  if (
    options?.skipAutoPlan ||
    !autoPlanCallback ||
    !next.autoPlanEnabled
  ) {
    return;
  }

  const tasksChanged =
    Object.prototype.hasOwnProperty.call(patch, "tasks") && prev.tasks !== next.tasks;
  const settingsChanged =
    Object.prototype.hasOwnProperty.call(patch, "settings") &&
    prev.settings !== next.settings;

  if (tasksChanged || settingsChanged) {
    autoPlanCallback(next);
  }
};

const setState = (
  updater: StateUpdater,
  options: SetStateOptions = {},
): void => {
  const previous = state;
  const patch =
    typeof updater === "function" ? updater(previous) : updater;

  if (!patch) return;

  let next: MomentumState = {
    ...previous,
    ...patch,
  };

  next = {
    ...next,
    focusMode: reconcileFocusModeState(previous, next),
  };

  const focusModeChanged = previous.focusMode !== next.focusMode;

  const changed =
    focusModeChanged ||
    (Object.keys(patch) as Array<keyof MomentumState>).some(
      (key) => previous[key] !== next[key],
    );

  if (!changed) {
    return;
  }

  state = next;

  if (options.persist !== false) {
    persistState(next);
  }

  notify();
  maybeRunAutoPlan(previous, next, patch, options);
};

const getState = (): MomentumState => state;

const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const reset = (): void => {
  state = createDefaultState();
  persistState(state);
  notify();
};

export const momentumStore = {
  getState,
  setState,
  subscribe,
  reset,
};

export const setAutoPlanCallback = (
  callback: AutoPlanCallback | null,
  options: { runImmediately?: boolean } = {},
): void => {
  autoPlanCallback = callback;

  if (callback && options.runImmediately && state.autoPlanEnabled) {
    callback(state);
  }
};

export const runAutoPlan = (): void => {
  if (autoPlanCallback && state.autoPlanEnabled) {
    autoPlanCallback(state);
  }
};

export const setAutoPlanEnabled = (enabled: boolean): void => {
  setState({ autoPlanEnabled: enabled });
};

export const enterFocusMode = (): void => {
  setState(
    (current) => ({
      focusMode: createFocusModeState({
        ...current.focusMode,
        enabled: true,
      }),
    }),
    { skipAutoPlan: true },
  );
};

export const exitFocusMode = (): void => {
  setState(
    { focusMode: createFocusModeState({ enabled: false }) },
    { skipAutoPlan: true },
  );
};

export const setFocusMode = (enabled: boolean): void => {
  if (enabled) {
    enterFocusMode();
    return;
  }

  exitFocusMode();
};

export const toggleFocusMode = (): void => {
  setState(
    (current) => ({
      focusMode: createFocusModeState({
        ...current.focusMode,
        enabled: !current.focusMode.enabled,
      }),
    }),
    { skipAutoPlan: true },
  );
};

export const startFocusTask = (): void => {
  const snapshot = getState();
  const { focusMode, tasks } = snapshot;
  if (!focusMode.enabled || !focusMode.activeTaskId) {
    return;
  }

  const activeTask = tasks.find((task) => task.id === focusMode.activeTaskId);
  if (!activeTask || activeTask.status === Status.ACTIVE) {
    return;
  }

  updateTask(focusMode.activeTaskId, {
    status: Status.ACTIVE,
    completedAt: null,
  });
};

export const completeFocusTask = (): void => {
  const snapshot = getState();
  const { focusMode, tasks } = snapshot;
  if (!focusMode.enabled || !focusMode.activeTaskId) {
    return;
  }

  const activeTask = tasks.find((task) => task.id === focusMode.activeTaskId);
  if (!activeTask || activeTask.status === Status.DONE) {
    return;
  }

  updateTask(focusMode.activeTaskId, {
    status: Status.DONE,
    completedAt: new Date().toISOString(),
    manualPinned: false,
  });
};

export const skipFocusTask = (): void => {
  const snapshot = getState();
  const { focusMode, tasks } = snapshot;
  if (!focusMode.enabled || !focusMode.activeTaskId) {
    return;
  }

  const activeTaskId = focusMode.activeTaskId;
  const activeTask = tasks.find((task) => task.id === activeTaskId);

  setState(
    (current) => {
      if (
        !current.focusMode.enabled ||
        current.focusMode.queue.length <= 1 ||
        current.focusMode.activeTaskId !== activeTaskId
      ) {
        return null;
      }

      const queue = current.focusMode.queue.slice();
      const index = queue.indexOf(activeTaskId);
      if (index === -1) {
        return null;
      }

      const [rotated] = queue.splice(index, 1);
      queue.push(rotated);

      return {
        focusMode: {
          ...current.focusMode,
          queue,
          activeTaskId: queue[0] ?? rotated ?? null,
        },
      };
    },
    { skipAutoPlan: true },
  );

  if (activeTask && activeTask.status === Status.ACTIVE) {
    updateTask(activeTaskId, {
      status: Status.BACKLOG,
      completedAt: null,
    });
  }
};

export const focusNextTask = (): void => {
  const snapshot = getState();
  const { focusMode, tasks } = snapshot;
  if (!focusMode.enabled || !focusMode.activeTaskId) {
    return;
  }

  if (focusMode.queue.length <= 1) {
    return;
  }

  const activeTaskId = focusMode.activeTaskId;
  const activeTask = tasks.find((task) => task.id === activeTaskId);

  setState(
    (current) => {
      if (!current.focusMode.enabled || current.focusMode.activeTaskId !== activeTaskId) {
        return null;
      }

      const queue = current.focusMode.queue;
      const index = queue.indexOf(activeTaskId);
      if (index === -1) {
        return null;
      }

      const nextIndex = (index + 1) % queue.length;

      return {
        focusMode: {
          ...current.focusMode,
          activeTaskId: queue[nextIndex] ?? current.focusMode.activeTaskId,
        },
      };
    },
    { skipAutoPlan: true },
  );

  if (activeTask && activeTask.status === Status.ACTIVE) {
    updateTask(activeTaskId, {
      status: Status.BACKLOG,
      completedAt: null,
    });
  }
};

export const upsertTask = (task: Task): void => {
  setState((current) => {
    const existingIndex = current.tasks.findIndex((item) => item.id === task.id);

    if (existingIndex === -1) {
      return {
        tasks: [...current.tasks, withTimestamps(task, true)],
      };
    }

    const nextTasks = [...current.tasks];
    nextTasks[existingIndex] = withTimestamps(
      { ...nextTasks[existingIndex], ...task },
      false,
    );

    return { tasks: nextTasks };
  });
};

export const updateTask = (taskId: string, patch: Partial<Task>): void => {
  setState((current) => {
    const index = current.tasks.findIndex((task) => task.id === taskId);
    if (index === -1) {
      return null;
    }

    const updated = withTimestamps({ ...current.tasks[index], ...patch, id: taskId }, false);
    const nextTasks = [...current.tasks];
    nextTasks[index] = updated;

    return { tasks: nextTasks };
  });
};

export const removeTask = (taskId: string): void => {
  setState((current) => ({
    tasks: current.tasks.filter((task) => task.id !== taskId),
  }));
};

export const updateTaskStatus = (taskId: string, status: Status): void => {
  setState((current) => ({
    tasks: current.tasks.map((task) =>
      task.id === taskId
        ? withTimestamps({ ...task, status }, false)
        : task,
    ),
  }));
};

export const setTasks = (tasks: Task[]): void => {
  setState({ tasks });
};

export const addQuickTask = (title: string): Task => {
  const {
    settings: { defaultPriority },
  } = getState();

  const task: Task = {
    id: createId(),
    title,
    priority: defaultPriority ?? Priority.MEDIUM,
    status: Status.BACKLOG,
    createdAt: new Date().toISOString(),
    manualPinned: false,
  };

  upsertTask(task);
  return task;
};

export const updateSettings = (patch: Partial<UserSettings>): void => {
  setState((current) => ({
    settings: { ...current.settings, ...patch },
  }));
};

export const setSession = (patch: Partial<SessionInfo>): void => {
  setState(
    (current) => ({
      session: { ...current.session, ...patch },
    }),
    { skipAutoPlan: true },
  );
};

export const clearSession = (): void => {
  setState(
    { session: createDefaultSession() },
    { skipAutoPlan: true },
  );
};

export const resetStore = (): void => {
  reset();
};

const identity = (value: MomentumState): MomentumState => value;

export function useMomentumStore(): MomentumState;
export function useMomentumStore<T>(selector: (state: MomentumState) => T): T;
export function useMomentumStore<T>(selector: (state: MomentumState) => T = identity as unknown as (state: MomentumState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(getState()),
  );
}

export const useTasks = (): Task[] => useMomentumStore((store) => store.tasks);

export const useSettings = (): UserSettings =>
  useMomentumStore((store) => store.settings);

export const useFocusMode = (): FocusModeState =>
  useMomentumStore((store) => store.focusMode);

export const useSession = (): SessionInfo =>
  useMomentumStore((store) => store.session);

export const useAutoPlanEnabled = (): boolean =>
  useMomentumStore((store) => store.autoPlanEnabled);

export const useMomentumSelectors = <T extends Array<unknown>>(
  selectors: { [K in keyof T]: (state: MomentumState) => T[K] },
): T => {
  const snapshot = useMomentumStore();
  return useMemo(
    () => selectors.map((selector) => selector(snapshot)) as T,
    [selectors, snapshot],
  );
};

const withTimestamps = (task: Task, isNew: boolean): Task => ({
  ...task,
  createdAt: isNew ? task.createdAt ?? new Date().toISOString() : task.createdAt,
  updatedAt: isNew ? task.updatedAt ?? null : new Date().toISOString(),
});

export const momentumState = {
  getState,
  setState,
  subscribe,
};
