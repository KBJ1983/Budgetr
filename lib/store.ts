"use client";

import { useSyncExternalStore } from "react";
import { exampleBudget } from "./domain/example";
import type { Budget } from "./domain/types";

/**
 * Client-side store. There is no login or server yet: everything lives in this browser's
 * localStorage. When accounts arrive, swap this module for an API-backed one with the same hooks.
 */
export interface AppState {
  version: 1;
  budgets: Budget[];
  activeId: string;
  theme: "light" | "dark";
}

const KEY = "budgetr:v1";
const listeners = new Set<() => void>();
let cache: AppState | null = null;

function fresh(): AppState {
  const ex = exampleBudget();
  return { version: 1, budgets: [ex], activeId: ex.id, theme: "dark" };
}

function load(): AppState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.version === 1 && Array.isArray(parsed.budgets) && parsed.budgets.length > 0) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    // Private mode or corrupt data: fall back to a fresh example.
  }
  cache = fresh();
  persist(cache);
  return cache;
}

function persist(state: AppState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked; the session keeps working in memory.
  }
}

export function setState(next: AppState | ((s: AppState) => AppState)) {
  const cur = load();
  cache = typeof next === "function" ? next(cur) : next;
  persist(cache);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** null during server render / before hydration. */
export function useAppState(): AppState | null {
  return useSyncExternalStore(subscribe, load, () => null);
}

export function activeBudget(s: AppState): Budget {
  return s.budgets.find((b) => b.id === s.activeId) ?? s.budgets[0]!;
}

export function updateBudget(id: string, fn: (b: Budget) => Budget) {
  setState((s) => ({
    ...s,
    budgets: s.budgets.map((b) => (b.id === id ? { ...fn(b), updatedAt: new Date().toISOString() } : b)),
  }));
}

export function addBudget(b: Budget) {
  setState((s) => ({ ...s, budgets: [...s.budgets.filter((x) => x.id !== b.id), b], activeId: b.id }));
}

export function setActive(id: string) {
  setState((s) => ({ ...s, activeId: id }));
}

export function deleteBudget(id: string) {
  setState((s) => {
    const rest = s.budgets.filter((b) => b.id !== id);
    const budgets = rest.length > 0 ? rest : [exampleBudget()];
    return { ...s, budgets, activeId: s.activeId === id ? budgets[0]!.id : s.activeId };
  });
}

export function resetExample() {
  const ex = exampleBudget();
  setState((s) => ({ ...s, budgets: [ex, ...s.budgets.filter((b) => b.id !== ex.id)], activeId: ex.id }));
}

export function setTheme(theme: AppState["theme"]) {
  setState((s) => ({ ...s, theme }));
}
