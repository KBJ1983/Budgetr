"use client";

import { useSyncExternalStore } from "react";
import { exampleBudget } from "./domain/example";
import type { Budget } from "./domain/types";
import { findUser, userById, type TestUser } from "./users";

/**
 * Client-side store with a simple test-user layer: the session holds a user id (no password),
 * and every user has their own state in this browser's localStorage. When real accounts arrive,
 * swap this module for an API-backed one with the same hooks.
 */
export interface AppState {
  version: 1;
  budgets: Budget[];
  /** "" when the user has no budget yet. */
  activeId: string;
  theme: "light" | "dark";
}

export interface Snapshot {
  user: TestUser | null;
  state: AppState | null;
}

const SESSION_KEY = "budgetr:session";
/** Pre-user-layer key; its data belongs to KBJ. */
const LEGACY_KEY = "budgetr:v1";
const stateKey = (userId: string) => `budgetr:v1:${userId}`;

const listeners = new Set<() => void>();
let snap: Snapshot | null = null;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full; keep working in memory.
  }
}

function fresh(user: TestUser): AppState {
  if (user.seed === "example") {
    const ex = exampleBudget();
    return { version: 1, budgets: [ex], activeId: ex.id, theme: "dark" };
  }
  return { version: 1, budgets: [], activeId: "", theme: "dark" };
}

function loadState(user: TestUser): AppState {
  let raw = read(stateKey(user.id));
  if (!raw && user.id === "kbj") {
    raw = read(LEGACY_KEY);
    if (raw) {
      write(stateKey(user.id), raw);
      write(LEGACY_KEY, null);
    }
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.version === 1 && Array.isArray(parsed.budgets)) return parsed;
    } catch {
      // Corrupt data: start over for this user.
    }
  }
  const s = fresh(user);
  write(stateKey(user.id), JSON.stringify(s));
  return s;
}

function load(): Snapshot {
  if (snap) return snap;
  const user = userById(read(SESSION_KEY)) ?? null;
  snap = { user, state: user ? loadState(user) : null };
  return snap;
}

const emit = () => listeners.forEach((l) => l());

export function setState(next: AppState | ((s: AppState) => AppState)) {
  const cur = load();
  if (!cur.user || !cur.state) return;
  const state = typeof next === "function" ? next(cur.state) : next;
  snap = { user: cur.user, state };
  write(stateKey(cur.user.id), JSON.stringify(state));
  emit();
}

/** Switches to the user with this login. Returns the user, or undefined if nobody has it. */
export function login(loginName: string): TestUser | undefined {
  const user = findUser(loginName);
  if (!user) return undefined;
  write(SESSION_KEY, user.id);
  snap = null;
  emit();
  return user;
}

export function logout() {
  write(SESSION_KEY, null);
  snap = null;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY || e.key?.startsWith("budgetr:v1")) {
      snap = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const SERVER: Snapshot = { user: null, state: null };

/** Current user and their state. `ready` is false during server render / before hydration. */
export function useSession(): Snapshot & { ready: boolean } {
  const s = useSyncExternalStore(subscribe, load, () => SERVER);
  return { ...s, ready: s !== SERVER };
}

export function activeBudget(s: AppState): Budget | undefined {
  return s.budgets.find((b) => b.id === s.activeId) ?? s.budgets[0];
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
    const budgets = s.budgets.filter((b) => b.id !== id);
    return { ...s, budgets, activeId: s.activeId === id ? (budgets[0]?.id ?? "") : s.activeId };
  });
}

/** Adds (or resets) the Anna og Jonas example for the current user. */
export function resetExample() {
  const ex = exampleBudget();
  setState((s) => ({ ...s, budgets: [ex, ...s.budgets.filter((b) => b.id !== ex.id)], activeId: ex.id }));
}

export function setTheme(theme: AppState["theme"]) {
  setState((s) => ({ ...s, theme }));
}
