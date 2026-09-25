/**
 * Durable per-user budget storage on the local disk, so a user's data survives a cleared browser.
 * The app still keeps a copy in localStorage; this file is the safe copy.
 *
 *   <dir>/<userId>.json                      current budget
 *   <dir>/backups/<userId>/<timestamp>.json  earlier versions (one per BACKUP_EVERY_MS, newest MAX_BACKUPS kept)
 *
 * <dir> is BUDGETR_DATA_DIR or ./data (git-ignored – real data never goes into git).
 */
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const BACKUP_EVERY_MS = 10 * 60 * 1000;
export const MAX_BACKUPS = 200;
export const MAX_BYTES = 5 * 1024 * 1024;

export const dataDir = () => process.env.BUDGETR_DATA_DIR || path.join(process.cwd(), "data");

const stamp = (d: Date) => d.toISOString().replace(/[:.]/g, "-");

/** A saved budget must be a JSON object with an entries array (same check as the app's normalize). */
export function isBudget(x: unknown): x is { entries: unknown[] } {
  return !!x && typeof x === "object" && !Array.isArray(x) && Array.isArray((x as { entries?: unknown }).entries);
}

export async function readBudget(userId: string, dir = dataDir()): Promise<string | null> {
  try {
    return await readFile(path.join(dir, `${userId}.json`), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Writes the budget atomically and first keeps the previous version as a backup when the last one is old enough. */
export async function writeBudget(userId: string, json: string, dir = dataDir(), now = new Date()): Promise<void> {
  const file = path.join(dir, `${userId}.json`);
  const backups = path.join(dir, "backups", userId);
  await mkdir(backups, { recursive: true });

  const prev = await readBudget(userId, dir);
  if (prev !== null && prev !== json) {
    const names = (await readdir(backups)).filter((n) => n.endsWith(".json")).sort();
    const last = names.at(-1);
    const lastTime = last ? Date.parse(last.slice(0, -5).replace(/T(\d\d)-(\d\d)-(\d\d)-(\d+)Z$/, "T$1:$2:$3.$4Z")) : 0;
    if (!last || !(now.getTime() - lastTime < BACKUP_EVERY_MS)) {
      await writeFile(path.join(backups, `${stamp(now)}.json`), prev, "utf8");
      names.push(`${stamp(now)}.json`);
      for (const old of names.slice(0, Math.max(0, names.length - MAX_BACKUPS))) await unlink(path.join(backups, old));
    }
  }

  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, json, "utf8");
  await rename(tmp, file);
}
