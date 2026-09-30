/**
 * Real accounts, next to the test users in lib/users.ts. Signing up takes first name, last name, e-mail and a
 * Danish mobile number; the account can only be used once the e-mail is confirmed through the link we send.
 * There are no passwords: logging in later also goes through a link sent by e-mail.
 *
 *   <dir>/accounts/<id>.json   { id, firstName, lastName, email, phone, createdAt, verifiedAt?, token?, lastMailAt? }
 *   <dir>/profiles/<id>.json   e-mail + phone for reminders (lib/profile.ts), written when the e-mail is confirmed
 *
 * <dir> is BUDGETR_DATA_DIR or ./data (git-ignored). A link holds "<id>.<random>"; only a hash of the random part
 * is stored, it works once, and a new link replaces the previous one.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { writeProfile } from "./profile";
import { normalizeEmail, type SignupInput } from "./signup";
import { isAccountId } from "./users";

export const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
export const LOGIN_TTL_MS = 20 * 60 * 1000;
/** No new mail to the same account within this gap (a double click, or someone hammering the form). */
export const RESEND_GAP_MS = 60 * 1000;

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
  token?: { hash: string; purpose: Purpose; expires: string };
  lastMailAt?: string;
}

/** A link to mail: which kind, and the token that goes into it. */
export interface Link {
  account: Account;
  purpose: Purpose;
  token: string;
}

const dataDir = () => process.env.BUDGETR_DATA_DIR || path.join(process.cwd(), "data");
const accountsDir = (dir: string) => path.join(dir, "accounts");

export const displayName = (a: Pick<Account, "firstName" | "lastName">) => `${a.firstName} ${a.lastName}`;

export async function readAccount(id: string, dir = dataDir()): Promise<Account | null> {
  if (!isAccountId(id)) return null;
  try {
    const a = JSON.parse(await readFile(path.join(accountsDir(dir), `${id}.json`), "utf8"));
    return a && a.id === id ? (a as Account) : null;
  } catch {
    return null;
  }
}

async function saveAccount(a: Account, dir: string): Promise<void> {
  await mkdir(accountsDir(dir), { recursive: true });
  const file = path.join(accountsDir(dir), `${a.id}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(a, null, 1), "utf8");
  await rename(tmp, file);
}

export async function findByEmail(email: string, dir = dataDir()): Promise<Account | null> {
  const key = normalizeEmail(email);
  let names: string[];
  try {
    names = await readdir(accountsDir(dir));
  } catch {
    return null;
  }
  for (const n of names) {
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

/** Gives the account a fresh link (replacing any earlier one) and saves it. */
async function issue(a: Account, purpose: Purpose, now: Date, dir: string): Promise<Link> {
  const secret = randomBytes(24).toString("base64url");
  const ttl = purpose === "verify" ? VERIFY_TTL_MS : LOGIN_TTL_MS;
  a.token = { hash: hash(secret), purpose, expires: new Date(now.getTime() + ttl).toISOString() };
  a.lastMailAt = now.toISOString();
  await saveAccount(a, dir);
  return { account: a, purpose, token: `${a.id}.${secret}` };
}

/**
 * Signs up, or – when the e-mail already has an account – hands out the right link for it: a confirmed account
 * gets a login link (its details are not changed), an unconfirmed one takes the new details and a new confirm
 * link. Returns null when a mail went out to that account less than RESEND_GAP_MS ago.
 */
export async function signup(input: SignupInput, now = new Date(), dir = dataDir()): Promise<Link | null> {
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
export async function requestLogin(email: string, now = new Date(), dir = dataDir()): Promise<Link | null> {
  const a = await findByEmail(email, dir);
  if (!a || throttled(a, now)) return null;
  return issue(a, a.verifiedAt ? "login" : "verify", now, dir);
}

/**
 * Uses a link. On success the link is spent, a first use confirms the e-mail (and writes the profile the reminders
 * read), and the account is returned. An unknown, used or expired link gives null.
 */
export async function redeem(token: unknown, now = new Date(), dir = dataDir()): Promise<Account | null> {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  const id = token.slice(0, dot), secret = token.slice(dot + 1);
  if (dot < 0 || !secret) return null;
  const a = await readAccount(id, dir);
  if (!a?.token) return null;
  const want = Buffer.from(a.token.hash, "hex"), got = Buffer.from(hash(secret), "hex");
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (!(Date.parse(a.token.expires) > now.getTime())) return null;
  delete a.token;
  if (!a.verifiedAt) {
    a.verifiedAt = now.toISOString();
    await writeProfile(a.id, { email: a.email, phone: a.phone }, dir);
  }
  await saveAccount(a, dir);
  return a;
}
