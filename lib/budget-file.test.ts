import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BACKUP_EVERY_MS, isBudget, readBudget, writeBudget } from "./budget-file";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "budgetr-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const doc = (n: number) => JSON.stringify({ entries: [], n });

describe("budget file storage", () => {
  it("returns null before anything is saved, then the saved budget", async () => {
    expect(await readBudget("test1", dir)).toBeNull();
    await writeBudget("test1", doc(1), dir);
    expect(await readBudget("test1", dir)).toBe(doc(1));
  });

  it("keeps the previous version as a backup, at most one per interval", async () => {
    const t0 = new Date("2026-01-01T10:00:00.000Z");
    const later = (ms: number) => new Date(t0.getTime() + ms);
    await writeBudget("test1", doc(1), dir, t0);
    await writeBudget("test1", doc(2), dir, later(1000));
    await writeBudget("test1", doc(3), dir, later(2000));
    const backups = path.join(dir, "backups", "test1");
    expect(await readdir(backups)).toHaveLength(1);
    await writeBudget("test1", doc(4), dir, later(BACKUP_EVERY_MS + 2000));
    expect(await readdir(backups)).toHaveLength(2);
    expect(await readBudget("test1", dir)).toBe(doc(4));
  });

  it("accepts only objects with an entries array", () => {
    expect(isBudget({ entries: [] })).toBe(true);
    expect(isBudget({})).toBe(false);
    expect(isBudget([])).toBe(false);
    expect(isBudget(null)).toBe(false);
  });
});
