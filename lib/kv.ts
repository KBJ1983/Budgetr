/**
 * Where budgets, accounts, profiles and the session key are kept. Keys are paths like "kbj.json",
 * "accounts/u-….json" or "backups/kbj/<stamp>.json".
 *
 * - Upstash Redis when its REST URL and token are set (Vercel's Upstash integration adds KV_REST_API_URL +
 *   KV_REST_API_TOKEN; UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN also work). Each folder keeps a set of
 *   its names, so a folder can be listed without scanning.
 * - Otherwise files on the local disk under BUDGETR_DATA_DIR or ./data (git-ignored).
 *
 * Passing a dir always means the disk (the tests use a temp dir). Only node: imports and @upstash/redis, so Node
 * can run it directly from scripts/send-reminders.mjs (through lib/profile.ts).
 */
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  /** Writes only when the key doesn't exist yet; true when it was written. */
  add(key: string, value: string): Promise<boolean>;
  del(key: string): Promise<void>;
  /** The names directly in a folder ("" is the top level), in no particular order. */
  list(folder: string): Promise<string[]>;
}

export const dataDir = () => process.env.BUDGETR_DATA_DIR || path.join(process.cwd(), "data");

function diskStore(dir: string): Store {
  const file = (key: string) => path.join(dir, ...key.split("/"));
  return {
    async get(key) {
      try {
        return await readFile(file(key), "utf8");
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
    },
    async set(key, value) {
      const f = file(key);
      await mkdir(path.dirname(f), { recursive: true });
      const tmp = `${f}.${process.pid}.tmp`;
      await writeFile(tmp, value, "utf8");
      await rename(tmp, f);
    },
    async add(key, value) {
      const f = file(key);
      await mkdir(path.dirname(f), { recursive: true });
      try {
        await writeFile(f, value, { encoding: "utf8", flag: "wx" });
        return true;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "EEXIST") return false;
        throw e;
      }
    },
    async del(key) {
      await unlink(file(key)).catch((e) => {
        if (e.code !== "ENOENT") throw e;
      });
    },
    async list(folder) {
      try {
        const entries = await readdir(folder ? file(folder) : dir, { withFileTypes: true });
        return entries.filter((e) => e.isFile() && !e.name.endsWith(".tmp")).map((e) => e.name);
      } catch {
        return [];
      }
    },
  };
}

const PREFIX = "budgetr:";

export function redisStore(redis: Redis): Store {
  const split = (key: string) => {
    const i = key.lastIndexOf("/");
    return [i < 0 ? "" : key.slice(0, i), key.slice(i + 1)] as const;
  };
  const index = (folder: string) => `${PREFIX}ls:${folder}`;
  const k = (key: string) => `${PREFIX}${key}`;
  return {
    async get(key) {
      return redis.get<string>(k(key));
    },
    async set(key, value) {
      const [folder, name] = split(key);
      await redis.multi().set(k(key), value).sadd(index(folder), name).exec();
    },
    async add(key, value) {
      const [folder, name] = split(key);
      if ((await redis.set(k(key), value, { nx: true })) === null) return false;
      await redis.sadd(index(folder), name);
      return true;
    },
    async del(key) {
      const [folder, name] = split(key);
      await redis.multi().del(k(key)).srem(index(folder), name).exec();
    },
    async list(folder) {
      return redis.smembers(index(folder));
    },
  };
}

let shared: Store | undefined;

export function openStore(dir?: string): Store {
  if (dir) return diskStore(dir);
  if (!shared) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    // Values are JSON text; keep them as text instead of letting the client parse them.
    shared = url && token ? redisStore(new Redis({ url, token, automaticDeserialization: false })) : diskStore(dataDir());
  }
  return shared;
}
