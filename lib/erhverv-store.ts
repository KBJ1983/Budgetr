/**
 * Henvendelser from the Erhverv page. Each one is kept in the store as "erhverv/henvendelser/<stamp>-<rand>.json", so
 * nothing is lost when mail isn't set up, and mailed to the owner (OWNER_EMAILS). To keep the form from being used
 * for spam: at most MAX_PER_EMAIL a day from one e-mail and MAX_PER_DAY a day in all (log "erhverv/log.json").
 */
import { randomBytes } from "node:crypto";
import type { Inquiry } from "./erhverv";
import { openStore } from "./kv";

export const MAX_PER_EMAIL = 3;
export const MAX_PER_DAY = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

type LogEntry = { at: string; email: string };

/** Counts a henvendelse; false (and nothing counted) when today's limit is reached. */
export async function takeInquiry(email: string, now = new Date(), dir?: string): Promise<boolean> {
  const store = openStore(dir), key = "erhverv/log.json";
  let log: LogEntry[] = [];
  try {
    const j = JSON.parse((await store.get(key)) || "[]");
    if (Array.isArray(j)) log = j.filter((e): e is LogEntry => typeof e?.at === "string" && typeof e?.email === "string");
  } catch {}
  log = log.filter((e) => now.getTime() - Date.parse(e.at) < DAY_MS);
  if (log.length >= MAX_PER_DAY || log.filter((e) => e.email === email).length >= MAX_PER_EMAIL) return false;
  log.push({ at: now.toISOString(), email });
  await store.set(key, JSON.stringify(log));
  return true;
}

export async function saveInquiry(i: Inquiry, now = new Date(), dir?: string, source?: string): Promise<string> {
  const id = `${now.toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`;
  const row = { id, at: now.toISOString(), ...i, ...(source ? { source } : {}) };
  await openStore(dir).set(`erhverv/henvendelser/${id}.json`, JSON.stringify(row, null, 2));
  return id;
}
