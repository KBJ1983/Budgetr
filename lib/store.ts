"use client";

import { useSyncExternalStore } from "react";
import { findUser, isAccountId, userById, type TestUser } from "./users";

/**
 * Client session. localStorage "budgetr:session" holds the user id; the budget app at /app
 * (public/budgetr-app/index.html) reads it and stores each user's budget under "budgetr-app:<userId>".
 * Test users log in here without a password. Real accounts (lib/accounts.ts) also get an httpOnly
 * session cookie from /api/auth/redeem, which the budget API checks; their name is kept in
 * "budgetr:session-name" so the app can show it.
 */
export const SESSION_KEY = "budgetr:session";
export const SESSION_NAME_KEY = "budgetr:session-name";

export interface SessionUser {
  id: string;
  name: string;
}

const listeners = new Set<() => void>();
let cached: SessionUser | null | undefined;

function read(): SessionUser | null {
  if (cached !== undefined) return cached;
  let id: string | null = null, name: string | null = null;
  try {
    id = window.localStorage.getItem(SESSION_KEY);
    name = window.localStorage.getItem(SESSION_NAME_KEY);
  } catch {
    // Storage blocked: behave as logged out.
  }
  const test = userById(id);
  cached = test ? { id: test.id, name: test.name } : isAccountId(id) ? { id, name: name || "din konto" } : null;
  return cached;
}

function write(id: string | null, name?: string) {
  try {
    window.localStorage.removeItem(SESSION_NAME_KEY);
    if (id === null) window.localStorage.removeItem(SESSION_KEY);
    else window.localStorage.setItem(SESSION_KEY, id);
    if (id !== null && name) window.localStorage.setItem(SESSION_NAME_KEY, name);
  } catch {
    // Ignore; the session then only lives in memory.
  }
  cached = undefined;
  listeners.forEach((l) => l());
}

/** Switches to the test user with this login. Returns the user, or undefined if nobody has it. */
export function login(loginName: string): TestUser | undefined {
  const user = findUser(loginName);
  if (user) {
    void fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    write(user.id);
  }
  return user;
}

/** After /api/auth/redeem has set the session cookie for a real account. */
export function startAccountSession(id: string, name: string) {
  write(id, name);
}

export function logout() {
  void fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  write(null);
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY || e.key === SESSION_NAME_KEY) {
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

/** The logged-in user. `ready` is false during server render / before hydration. */
export function useSession(): { user: SessionUser | null; ready: boolean } {
  const u = useSyncExternalStore<SessionUser | null | typeof SERVER>(subscribe, read, () => SERVER);
  return u === SERVER ? { user: null, ready: false } : { user: u, ready: true };
}
