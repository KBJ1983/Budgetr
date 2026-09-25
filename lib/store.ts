"use client";

import { useSyncExternalStore } from "react";
import { findUser, userById, type TestUser } from "./users";

/**
 * Test-user session (no password). The session holds a user id in localStorage under
 * "budgetr:session"; the budget app at /app (public/budgetr-app/index.html) reads it and
 * stores each user's budget under "budgetr-app:<userId>". Real accounts replace this later.
 */
export const SESSION_KEY = "budgetr:session";

const listeners = new Set<() => void>();
let cached: TestUser | null | undefined;

function read(): TestUser | null {
  if (cached !== undefined) return cached;
  let id: string | null = null;
  try {
    id = window.localStorage.getItem(SESSION_KEY);
  } catch {
    // Storage blocked: behave as logged out.
  }
  cached = userById(id) ?? null;
  return cached;
}

function write(id: string | null) {
  try {
    if (id === null) window.localStorage.removeItem(SESSION_KEY);
    else window.localStorage.setItem(SESSION_KEY, id);
  } catch {
    // Ignore; the session then only lives in memory.
  }
  cached = undefined;
  listeners.forEach((l) => l());
}

/** Switches to the user with this login. Returns the user, or undefined if nobody has it. */
export function login(loginName: string): TestUser | undefined {
  const user = findUser(loginName);
  if (user) write(user.id);
  return user;
}

export function logout() {
  write(null);
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) {
      cached = undefined;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const SERVER = Symbol("server");

/** The logged-in test user. `ready` is false during server render / before hydration. */
export function useSession(): { user: TestUser | null; ready: boolean } {
  const u = useSyncExternalStore<TestUser | null | typeof SERVER>(subscribe, read, () => SERVER);
  return u === SERVER ? { user: null, ready: false } : { user: u, ready: true };
}
