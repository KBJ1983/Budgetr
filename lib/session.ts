/**
 * Server session for real accounts: an httpOnly cookie "<userId>.<expires ms>.<HMAC>" set when a mailed link is
 * used (app/api/auth/redeem). The budget and profile APIs only serve an account to its own session. Test users
 * (lib/users.ts) need no cookie – they keep the old no-password trust level.
 *
 * The HMAC key is AUTH_SECRET (at least 32 characters) or, without it, a random key kept in <dir>/auth-secret.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readAccount } from "./accounts";
import { isAccountId, userById } from "./users";

export const SESSION_COOKIE = "budgetr_session";
export const SESSION_MAX_AGE_S = 90 * 24 * 60 * 60;

const dataDir = () => process.env.BUDGETR_DATA_DIR || path.join(process.cwd(), "data");

const keys = new Map<string, Promise<Buffer>>();

async function loadKey(dir: string): Promise<Buffer> {
  const env = process.env.AUTH_SECRET;
  if (env && env.length >= 32) return Buffer.from(env, "utf8");
  const file = path.join(dir, "auth-secret");
  try {
    return Buffer.from((await readFile(file, "utf8")).trim(), "base64url");
  } catch {
    await mkdir(dir, { recursive: true });
    const key = randomBytes(32).toString("base64url");
    try {
      await writeFile(file, key, { encoding: "utf8", flag: "wx" });
    } catch {
      // Another request wrote it first: use theirs.
      return Buffer.from((await readFile(file, "utf8")).trim(), "base64url");
    }
    return Buffer.from(key, "base64url");
  }
}

function key(dir: string) {
  let k = keys.get(dir);
  if (!k) {
    k = loadKey(dir);
    keys.set(dir, k);
    k.catch(() => keys.delete(dir));
  }
  return k;
}

const sign = (k: Buffer, body: string) => createHmac("sha256", k).update(body).digest("base64url");

export async function makeSession(userId: string, now = new Date(), dir = dataDir()): Promise<string> {
  const body = `${userId}.${now.getTime() + SESSION_MAX_AGE_S * 1000}`;
  return `${body}.${sign(await key(dir), body)}`;
}

/** The user id in a valid, unexpired session cookie, else null. */
export async function readSession(value: string | undefined, now = new Date(), dir = dataDir()): Promise<string | null> {
  const m = /^(u-[a-z0-9]{12})\.(\d+)\.([\w-]+)$/.exec(value || "");
  if (!m) return null;
  const [, id, exp, sig] = m as unknown as [string, string, string, string];
  const want = Buffer.from(sign(await key(dir), `${id}.${exp}`)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return Number(exp) > now.getTime() ? id : null;
}

/** May this request read and write userId's budget and profile? */
export async function canAccess(userId: string, cookie: string | undefined, now = new Date(), dir = dataDir()) {
  if (userById(userId)) return true;
  if (!isAccountId(userId) || (await readSession(cookie, now, dir)) !== userId) return false;
  return !!(await readAccount(userId, dir))?.verifiedAt;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_S,
};
