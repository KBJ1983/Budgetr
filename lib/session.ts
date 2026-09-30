/**
 * Server session for real accounts: an httpOnly cookie "<userId>[.<memberId>].<expires ms>.<HMAC>" set when a
 * mailed link or code is used (app/api/auth/redeem). The budget and profile APIs only serve an account to its own
 * sessions (the primary's and its members', lib/accounts.ts); a removed member's session stops working. Test users
 * (lib/users.ts) need no cookie – they keep the old no-password trust level.
 *
 * The HMAC key is AUTH_SECRET (at least 32 characters) or, without it, a random key kept as "auth-secret"
 * in the store (lib/kv.ts).
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readAccount, type Login } from "./accounts";
import { openStore } from "./kv";
import { isAccountId, userById } from "./users";

export const SESSION_COOKIE = "budgetr_session";
export const SESSION_MAX_AGE_S = 90 * 24 * 60 * 60;

const keys = new Map<string, Promise<Buffer>>();

async function loadKey(dir: string | undefined): Promise<Buffer> {
  const env = process.env.AUTH_SECRET;
  if (env && env.length >= 32) return Buffer.from(env, "utf8");
  const store = openStore(dir);
  // When another request wrote it first, add() leaves theirs in place and we use that.
  if ((await store.get("auth-secret")) === null) await store.add("auth-secret", randomBytes(32).toString("base64url"));
  return Buffer.from((await store.get("auth-secret"))!.trim(), "base64url");
}

function key(dir: string | undefined) {
  const id = dir ?? "";
  let k = keys.get(id);
  if (!k) {
    k = loadKey(dir);
    keys.set(id, k);
    k.catch(() => keys.delete(id));
  }
  return k;
}

const sign = (k: Buffer, body: string) => createHmac("sha256", k).update(body).digest("base64url");

/** A session for an account, or for one of its members (memberId) – both open the same budget. */
export async function makeSession(userId: string, now = new Date(), dir?: string, memberId?: string): Promise<string> {
  const body = `${userId}${memberId ? "." + memberId : ""}.${now.getTime() + SESSION_MAX_AGE_S * 1000}`;
  return `${body}.${sign(await key(dir), body)}`;
}

export interface Session {
  user: string;
  /** Set when a member (not the primary e-mail) logged in. */
  member?: string;
}

/** The account (and member) in a valid, unexpired session cookie, else null. */
export async function readSession(value: string | undefined, now = new Date(), dir?: string): Promise<Session | null> {
  const m = /^(u-[a-z0-9]{12})(?:\.(m-[a-z0-9]{8}))?\.(\d+)\.([\w-]+)$/.exec(value || "");
  if (!m) return null;
  const [, id, member, exp, sig] = m as unknown as [string, string, string | undefined, string, string];
  const want = Buffer.from(sign(await key(dir), `${id}${member ? "." + member : ""}.${exp}`)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (!(Number(exp) > now.getTime())) return null;
  return member ? { user: id, member } : { user: id };
}

/**
 * The login behind a session for userId's budget: the account, and the member when a member logged in. Null when
 * the cookie is for another account, the e-mail isn't confirmed, or the member has been taken off the budget.
 */
export async function sessionLogin(userId: string, cookie: string | undefined, now = new Date(), dir?: string): Promise<Login | null> {
  const s = await readSession(cookie, now, dir);
  if (!s || s.user !== userId) return null;
  const a = await readAccount(userId, dir);
  if (!a?.verifiedAt) return null;
  if (!s.member) return { account: a };
  const m = a.members?.find((x) => x.id === s.member);
  return m?.verifiedAt ? { account: a, member: m } : null;
}

/** May this request read and write userId's budget and profile? */
export async function canAccess(userId: string, cookie: string | undefined, now = new Date(), dir?: string) {
  if (userById(userId)) return true;
  return isAccountId(userId) && !!(await sessionLogin(userId, cookie, now, dir));
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_S,
};
