/**
 * Real accounts, next to the test users in lib/users.ts. Signing up takes first name, last name, e-mail and a
 * Danish mobile number; the account can only be used once the e-mail is confirmed through the mail we send.
 * There are no passwords: logging in later also goes through a mail. Each mail has a link and a 6-digit code;
 * either one works (the code is for when the mail is read on another device than the one logging in).
 *
 *   accounts/<id>.json   { id, firstName, lastName, email, phone, createdAt, verifiedAt?, token?, lastMailAt? }
 *   profiles/<id>.json   e-mail + phone for reminders (lib/profile.ts), written when the e-mail is confirmed
 *
 * in the store (lib/kv.ts; on disk under BUDGETR_DATA_DIR or ./data, git-ignored). A link holds "<id>.<random>";
 * only hashes of the random part and the code are stored. Link and code work once (using one spends both), a new
 * mail replaces the previous one, and MAX_CODE_TRIES wrong codes spend them too.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { openStore } from "./kv";
import { writeProfile } from "./profile";
import { normalizeEmail, type SignupInput } from "./signup";
import { isAccountId } from "./users";

export const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
export const LOGIN_TTL_MS = 20 * 60 * 1000;
/** No new mail to the same account within this gap (a double click, or someone hammering the form). */
export const RESEND_GAP_MS = 60 * 1000;
/** Wrong codes allowed per mail; then the link and code stop working and a new mail is needed. */
export const MAX_CODE_TRIES = 5;

export { isEmail, normalizeEmail, validateSignup, type SignupField, type SignupInput } from "./signup";

export type Purpose = "verify" | "login";

export interface Account {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** "+45" and 8 digits. */
  phone: string;
  createdAt: string;
  verifiedAt?: string;
  token?: { hash: string; code?: string; tries?: number; purpose: Purpose; expires: string };
  lastMailAt?: string;
}

/** A mail to send: which kind, the token for its link and the code. */
export interface Link {
  account: Account;
  purpose: Purpose;
  token: string;
  /** 6 digits. */
  code: string;
}

export const displayName = (a: Pick<Account, "firstName" | "lastName">) => `${a.firstName} ${a.lastName}`;

export async function readAccount(id: string, dir?: string): Promise<Account | null> {
  if (!isAccountId(id)) return null;
  try {
    const a = JSON.parse((await openStore(dir).get(`accounts/${id}.json`)) ?? "null");
    return a && a.id === id ? (a as Account) : null;
  } catch {
    return null;
  }
}

async function saveAccount(a: Account, dir: string | undefined): Promise<void> {
  await openStore(dir).set(`accounts/${a.id}.json`, JSON.stringify(a, null, 1));
}

export async function findByEmail(email: string, dir?: string): Promise<Account | null> {
  const key = normalizeEmail(email);
  for (const n of await openStore(dir).list("accounts")) {
    if (!n.endsWith(".json")) continue;
    const a = await readAccount(n.slice(0, -5), dir);
    if (a && a.email === key) return a;
  }
  return null;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const newId = () => "u-" + Array.from(randomBytes(12), (b) => ALPHABET[b % ALPHABET.length]).join("");
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

const throttled = (a: Account, now: Date) =>
  !!a.lastMailAt && now.getTime() - Date.parse(a.lastMailAt) < RESEND_GAP_MS;

// The code is hashed with the account id, so equal codes on two accounts don't look alike.
const codeHash = (id: string, code: string) => hash(`${id}:${code}`);
const newCode = () => String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0");

/** Gives the account a fresh link and code (replacing any earlier ones) and saves it. */
async function issue(a: Account, purpose: Purpose, now: Date, dir: string | undefined): Promise<Link> {
  const secret = randomBytes(24).toString("base64url"), code = newCode();
  const ttl = purpose === "verify" ? VERIFY_TTL_MS : LOGIN_TTL_MS;
  a.token = { hash: hash(secret), code: codeHash(a.id, code), tries: 0, purpose, expires: new Date(now.getTime() + ttl).toISOString() };
  a.lastMailAt = now.toISOString();
  await saveAccount(a, dir);
  return { account: a, purpose, token: `${a.id}.${secret}`, code };
}

/**
 * Signs up, or – when the e-mail already has an account – hands out the right link for it: a confirmed account
 * gets a login link (its details are not changed), an unconfirmed one takes the new details and a new confirm
 * link. Returns null when a mail went out to that account less than RESEND_GAP_MS ago.
 */
export async function signup(input: SignupInput, now = new Date(), dir?: string): Promise<Link | null> {
  const existing = await findByEmail(input.email, dir);
  if (existing) {
    if (throttled(existing, now)) return null;
    if (existing.verifiedAt) return issue(existing, "login", now, dir);
    Object.assign(existing, { firstName: input.firstName, lastName: input.lastName, phone: input.phone });
    return issue(existing, "verify", now, dir);
  }
  const a: Account = { id: newId(), ...input, createdAt: now.toISOString() };
  return issue(a, "verify", now, dir);
}

/** A login link for this e-mail (a confirm link while it isn't confirmed yet), or null for no account / throttled. */
export async function requestLogin(email: string, now = new Date(), dir?: string): Promise<Link | null> {
  const a = await findByEmail(email, dir);
  if (!a || throttled(a, now)) return null;
  return issue(a, a.verifiedAt ? "login" : "verify", now, dir);
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Spends the link and code; a first use confirms the e-mail (and writes the profile the reminders read). */
async function use(a: Account, now: Date, dir: string | undefined): Promise<Account> {
  delete a.token;
  if (!a.verifiedAt) {
    a.verifiedAt = now.toISOString();
    await writeProfile(a.id, { email: a.email, phone: a.phone }, dir);
  }
  await saveAccount(a, dir);
  return a;
}

/** Uses a link. On success the account is returned; an unknown, used or expired link gives null. */
export async function redeem(token: unknown, now = new Date(), dir?: string): Promise<Account | null> {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  const id = token.slice(0, dot), secret = token.slice(dot + 1);
  if (dot < 0 || !secret) return null;
  const a = await readAccount(id, dir);
  if (!a?.token || !same(a.token.hash, hash(secret))) return null;
  if (!(Date.parse(a.token.expires) > now.getTime())) return null;
  return use(a, now, dir);
}

/**
 * Uses the code from the mail, typed on the device that asked for it. Spaces are ignored. Gives null for an
 * unknown e-mail, a wrong, used or expired code, or after MAX_CODE_TRIES wrong tries (which also spends the link).
 */
export async function redeemCode(email: unknown, code: unknown, now = new Date(), dir?: string): Promise<Account | null> {
  const digits = typeof code === "string" ? code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(digits)) return null;
  const a = await findByEmail(normalizeEmail(email), dir);
  if (!a?.token?.code || !(Date.parse(a.token.expires) > now.getTime())) return null;
  if (same(a.token.code, codeHash(a.id, digits))) return use(a, now, dir);
  a.token.tries = (a.token.tries ?? 0) + 1;
  if (a.token.tries >= MAX_CODE_TRIES) delete a.token;
  await saveAccount(a, dir);
  return null;
}
