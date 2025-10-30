import { useMemo, useSyncExternalStore } from "react";

import {
  DEFAULT_USER_SETTINGS,
  Priority,
  Status,
  Task,
  UserSettings,
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
  focusMode: boolean;
  autoPlanEnabled: boolean;
  session: SessionInfo;
}

interface PersistedMomentumState {
  tasks: Task[];
  settings: UserSettings;
  focusMode: boolean;
  autoPlanEnabled: boolean;
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
  userId: "demo-user",
  displayName: "Momentum Explorer",
  isAuthenticated: true,
  expiresAt: new Date(Date.now() + 1_800_000).toISOString(),
});

const createDefaultState = (): MomentumState => ({
  tasks: [],
  settings: { ...DEFAULT_USER_SETTINGS },
  focusMode: false,
  autoPlanEnabled: true,
  session: createDefaultSession(),
});

const hydrateState = (): MomentumState => {
  const persisted = loadJSON<PersistedMomentumState | null>(STORAGE_KEY, null);

  if (!persisted) {
    return createDefaultState();
  }

  return {
    ...createDefaultState(),
    ...persisted,
    settings: { ...DEFAULT_USER_SETTINGS, ...persisted.settings },
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

  const next: MomentumState = {
    ...previous,
    ...patch,
  };

  const changed = (Object.keys(patch) as Array<keyof MomentumState>).some(
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

export const setFocusMode = (enabled: boolean): void => {
  setState({ focusMode: enabled });
};

export const toggleFocusMode = (): void => {
  setState((current) => ({ focusMode: !current.focusMode }));
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
    { persist: false, skipAutoPlan: true },
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

export const useFocusMode = (): boolean =>
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
