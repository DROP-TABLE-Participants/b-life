import { APP_STATE_VERSION, STORAGE_KEY } from "@/lib/constants";
import { createSeedAppState } from "@/lib/seed";
import type { AppState } from "@/types/domain";

const isBrowser = typeof window !== "undefined";

const safeParse = (value: string): AppState | null => {
  try {
    const parsed = JSON.parse(value) as AppState;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== APP_STATE_VERSION) return null;
    if (!Array.isArray(parsed.hospitals) || !Array.isArray(parsed.shipments)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveAppState = (state: AppState): void => {
  if (!isBrowser) return;
  const payload: AppState = {
    ...state,
    version: APP_STATE_VERSION,
    lastUpdated: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const getAppState = (): AppState | null => {
  if (!isBrowser) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return safeParse(raw);
};

export const seedAppStateIfEmpty = (): AppState => {
  const existing = getAppState();
  if (existing) return existing;

  const seeded = createSeedAppState();
  saveAppState(seeded);
  return seeded;
};

export const resetAppState = (): AppState => {
  if (isBrowser) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  const seeded = createSeedAppState();
  saveAppState(seeded);
  return seeded;
};
