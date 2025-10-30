const isBrowser = typeof window !== "undefined";

const getLocalStorage = (): Storage | null => {
  if (!isBrowser) {
    return null;
  }

  try {
    const storage = window.localStorage;
    const testKey = "__momentum_storage_test__";
    storage.setItem(testKey, "test");
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
};

const storageRef = getLocalStorage();

type Primitive = string | number | boolean | null;

type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };

export const safeStorage = {
  getItem(key: string): string | null {
    return storageRef ? storageRef.getItem(key) : null;
  },
  setItem(key: string, value: string): void {
    if (storageRef) {
      storageRef.setItem(key, value);
    }
  },
  removeItem(key: string): void {
    if (storageRef) {
      storageRef.removeItem(key);
    }
  },
  clear(): void {
    if (storageRef) {
      storageRef.clear();
    }
  },
};

export const loadJSON = <T extends JsonValue | Record<string, unknown> | undefined>(
  key: string,
  fallback: T,
): T => {
  const raw = safeStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const saveJSON = <T extends JsonValue | Record<string, unknown>>(
  key: string,
  value: T,
): void => {
  try {
    safeStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Swallow serialization errors; storage is a best-effort cache.
  }
};

export const remove = (key: string): void => {
  safeStorage.removeItem(key);
};

export const hasStorage = (): boolean => Boolean(storageRef);

export type { JsonValue };
