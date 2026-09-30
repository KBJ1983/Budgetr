import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Redis } from "@upstash/redis";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore, redisStore, type Store } from "./kv";

/** Just the Redis calls lib/kv.ts makes, kept in memory. */
function fakeRedis() {
  const strings = new Map<string, string>(), sets = new Map<string, Set<string>>();
  const set = (k: string) => sets.get(k) ?? sets.set(k, new Set()).get(k)!;
  const r = {
    get: async (k: string) => strings.get(k) ?? null,
    set: async (k: string, v: string, o?: { nx?: boolean }) => (o?.nx && strings.has(k) ? null : (strings.set(k, v), "OK")),
    del: async (k: string) => Number(strings.delete(k)),
    sadd: async (k: string, m: string) => (set(k).add(m), 1),
    srem: async (k: string, m: string) => Number(set(k).delete(m)),
    smembers: async (k: string) => [...set(k)],
    multi() {
      const ops: (() => Promise<unknown>)[] = [];
      const tx = {
        set: (k: string, v: string) => (ops.push(() => r.set(k, v)), tx),
        del: (k: string) => (ops.push(() => r.del(k)), tx),
        sadd: (k: string, m: string) => (ops.push(() => r.sadd(k, m)), tx),
        srem: (k: string, m: string) => (ops.push(() => r.srem(k, m)), tx),
        exec: async () => Promise.all(ops.map((f) => f())),
      };
      return tx;
    },
  };
  return r as unknown as Redis;
}

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "budgetr-kv-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe.each<[string, () => Store]>([
  ["disk", () => openStore(dir)],
  ["redis", () => redisStore(fakeRedis())],
])("%s store", (_, make) => {
  it("gets, sets, adds, lists and deletes", async () => {
    const s = make();
    expect(await s.get("kbj.json")).toBeNull();
    await s.set("kbj.json", "{}");
    await s.set("backups/kbj/a.json", "1");
    await s.set("backups/kbj/b.json", "2");
    expect(await s.get("kbj.json")).toBe("{}");
    expect((await s.list("backups/kbj")).sort()).toEqual(["a.json", "b.json"]);
    expect(await s.list("")).toContain("kbj.json");
    expect(await s.list("nothing")).toEqual([]);

    expect(await s.add("auth-secret", "first")).toBe(true);
    expect(await s.add("auth-secret", "second")).toBe(false);
    expect(await s.get("auth-secret")).toBe("first");

    await s.del("backups/kbj/a.json");
    await s.del("backups/kbj/missing.json");
    expect(await s.list("backups/kbj")).toEqual(["b.json"]);
    expect(await s.get("backups/kbj/a.json")).toBeNull();
  });
});
