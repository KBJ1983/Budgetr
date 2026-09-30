/**
 * Real accounts, next to the test users in lib/users.ts. Signing up takes first name, last name, e-mail and a
 * Danish mobile number; the account can only be used once the e-mail is confirmed through the mail we send.
 * There are no passwords: logging in later also goes through a mail. Each mail has a link and a 6-digit code;
 * either one works (the code is for when the mail is read on another device than the one logging in).
 *
 * A budget can be shared: the account's own e-mail is the primary login, and the primary can add up to
 * MAX_LOGINS - 1 more e-mails (members). A member logs in to the same budget with their own e-mail and gets their
 * own links and codes; one e-mail belongs to at most one account. The first time a member uses a link or code,
 * their e-mail counts as confirmed.
 *
 *   accounts/<id>.json   { id, firstName, lastName, email, phone, createdAt, verifiedAt?, token?, lastMailAt?,
 *                          members?: [{ id, firstName, email, invitedAt, verifiedAt?, token?, lastMailAt? }] }
 *   profiles/<id>.json   e-mail + phone for reminders (lib/profile.ts), written when the e-mail is confirmed
 *
 * in the store (lib/kv.ts; on disk under BUDGETR_DATA_DIR or ./data, git-ignored). A link holds "<id>.<random>"
 * (a member's "<id>.<member id>.<random>"); only hashes of the random part and the code are stored. Link and code
 * work once (using one spends both), a new mail replaces the previous one, and MAX_CODE_TRIES wrong codes spend
 * them too.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { openStore } from "./kv";
import { writeProfile } from "./profile";
import { isEmail, normalizeEmail, type SignupInput } from "./signup";
import { isAccountId } from "./users";

export const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
export const LOGIN_TTL_MS = 20 * 60 * 1000;
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** No new mail to the same account within this gap (a double click, or someone hammering the form). */
export const RESEND_GAP_MS = 60 * 1000;
/** Wrong codes allowed per mail; then the link and code stop working and a new mail is needed. */
export const MAX_CODE_TRIES = 5;
/** E-mails that can log in to one budget: the primary and the members. */
export const MAX_LOGINS = 3;

export { isEmail, normalizeEmail, validateSignup, type SignupField, type SignupInput } from "./signup";

export type Purpose = "verify" | "login" | "invite";

interface Token {
  hash: string;
  code?: string;
  tries?: number;
  purpose: Purpose;
  expires: string;
}

/** Someone who can log in: the account's primary e-mail, or a member. */
interface Holder {
  id: string;
  firstName: string;
  email: string;
  verifiedAt?: string;
  token?: Token;
  lastMailAt?: string;
}

export interface Member extends Holder {
  invitedAt: string;
}

export interface Account extends Holder {
  lastName: string;
  /** "+45" and 8 digits. */
  phone: string;
  createdAt: string;
  members?: Member[];
}

/** Who logged in: the account, and the member when it wasn't the primary e-mail. */
export interface Login {
  account: Account;
  member?: Member;
}

/** A mail to send: to whom, which kind, the token for its link and the code. */
export interface Link extends Login {
  purpose: Purpose;
  /** The receiver: the member, or else the account. */
  to: { email: string; firstName: string };
  token: string;
  /** 6 digits. */
  code: string;
}

export const displayName = (a: Pick<Account, "firstName" | "lastName">) => `${a.firstName} ${a.lastName}`;
/** The name the app shows for this login. */
export const loginName = (l: Login) => (l.member ? l.member.firstName : displayName(l.account));

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

/** The account and member (if any) that this e-mail logs in to. */
export async function findLogin(email: unknown, dir?: string): Promise<Login | null> {
  const key = normalizeEmail(email);
  if (!key) return null;
  for (const n of await openStore(dir).list("accounts")) {
    if (!n.endsWith(".json")) continue;
    const a = await readAccount(n.slice(0, -5), dir);
    if (!a) continue;
    if (a.email === key) return { account: a };
    const m = a.members?.find((x) => x.email === key);
    if (m) return { account: a, member: m };
  }
  return null;
}

/** The account whose primary e-mail this is. */
export async function findByEmail(email: string, dir?: string): Promise<Account | null> {
  const l = await findLogin(email, dir);
  return l && !l.member ? l.account : null;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const randomId = (prefix: string, n: number) =>
  prefix + Array.from(randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join("");
const newId = () => randomId("u-", 12);
const newMemberId = () => randomId("m-", 8);
export const isMemberId = (id: unknown): id is string => typeof id === "string" && /^m-[a-z0-9]{8}$/.test(id);
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

const holderOf = (l: Login): Holder => l.member ?? l.account;

const throttled = (h: Holder, now: Date) =>
  !!h.lastMailAt && now.getTime() - Date.parse(h.lastMailAt) < RESEND_GAP_MS;

// The code is hashed with the account (and member) id, so equal codes on two logins don't look alike.
const codeHash = (l: Login, code: string) => hash(`${l.account.id}${l.member ? "/" + l.member.id : ""}:${code}`);
const newCode = () => String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0");
const TTL: Record<Purpose, number> = { verify: VERIFY_TTL_MS, login: LOGIN_TTL_MS, invite: INVITE_TTL_MS };

/** Gives the login a fresh link and code (replacing any earlier ones) and saves the account. */
async function issue(l: Login, purpose: Purpose, now: Date, dir: string | undefined): Promise<Link> {
  const secret = randomBytes(24).toString("base64url"), code = newCode();
  const h = holderOf(l);
  h.token = { hash: hash(secret), code: codeHash(l, code), tries: 0, purpose, expires: new Date(now.getTime() + TTL[purpose]).toISOString() };
  h.lastMailAt = now.toISOString();
  await saveAccount(l.account, dir);
  const token = l.member ? `${l.account.id}.${l.member.id}.${secret}` : `${l.account.id}.${secret}`;
  return { ...l, purpose, to: { email: h.email, firstName: h.firstName }, token, code };
}

/**
 * Signs up, or – when the e-mail already logs in somewhere – hands out the right link for it: a confirmed account
 * or a member gets a login link (nothing is changed), an unconfirmed account takes the new details and a new
 * confirm link. Returns null when a mail went out to that e-mail less than RESEND_GAP_MS ago.
 */
export async function signup(input: SignupInput, now = new Date(), dir?: string): Promise<Link | null> {
  const existing = await findLogin(input.email, dir);
  if (existing) {
    if (throttled(holderOf(existing), now)) return null;
    if (existing.member || existing.account.verifiedAt) return issue(existing, "login", now, dir);
    Object.assign(existing.account, { firstName: input.firstName, lastName: input.lastName, phone: input.phone });
    return issue(existing, "verify", now, dir);
  }
  const a: Account = { id: newId(), ...input, createdAt: now.toISOString() };
  return issue({ account: a }, "verify", now, dir);
}

/**
 * A login link for this e-mail (a confirm link while an account isn't confirmed yet), or null for no account /
 * throttled. A member who hasn't taken the invite yet gets a login link too: using it confirms their e-mail.
 */
export async function requestLogin(email: string, now = new Date(), dir?: string): Promise<Link | null> {
  const l = await findLogin(email, dir);
  if (!l || throttled(holderOf(l), now)) return null;
  return issue(l, l.member || l.account.verifiedAt ? "login" : "verify", now, dir);
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Spends the link and code; a first use confirms the e-mail (and, for the account, writes the reminders' profile). */
async function use(l: Login, now: Date, dir: string | undefined): Promise<Login> {
  const h = holderOf(l);
  delete h.token;
  if (!h.verifiedAt) {
    h.verifiedAt = now.toISOString();
    if (!l.member) await writeProfile(l.account.id, { email: l.account.email, phone: l.account.phone }, dir);
  }
  await saveAccount(l.account, dir);
  return l;
}

async function loginById(id: string, memberId: string | undefined, dir: string | undefined): Promise<Login | null> {
  const a = await readAccount(id, dir);
  if (!a) return null;
  if (memberId === undefined) return { account: a };
  const m = a.members?.find((x) => x.id === memberId);
  return m ? { account: a, member: m } : null;
}

/** Uses a link. On success the login is returned; an unknown, used or expired link gives null. */
export async function redeem(token: unknown, now = new Date(), dir?: string): Promise<Login | null> {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2 || parts.length > 3) return null;
  const secret = parts[parts.length - 1]!;
  if (!secret || (parts.length === 3 && !isMemberId(parts[1]))) return null;
  const l = await loginById(parts[0]!, parts.length === 3 ? parts[1] : undefined, dir);
  const t = l && holderOf(l).token;
  if (!l || !t || !same(t.hash, hash(secret))) return null;
  if (!(Date.parse(t.expires) > now.getTime())) return null;
  return use(l, now, dir);
}

/**
 * Uses the code from the mail, typed on the device that asked for it. Spaces are ignored. Gives null for an
 * unknown e-mail, a wrong, used or expired code, or after MAX_CODE_TRIES wrong tries (which also spends the link).
 */
export async function redeemCode(email: unknown, code: unknown, now = new Date(), dir?: string): Promise<Login | null> {
  const digits = typeof code === "string" ? code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(digits)) return null;
  const l = await findLogin(email, dir);
  const t = l && holderOf(l).token;
  if (!l || !t?.code || !(Date.parse(t.expires) > now.getTime())) return null;
  if (same(t.code, codeHash(l, digits))) return use(l, now, dir);
  t.tries = (t.tries ?? 0) + 1;
  if (t.tries >= MAX_CODE_TRIES) delete holderOf(l).token;
  await saveAccount(l.account, dir);
  return null;
}

// ---- Sharing a budget ------------------------------------------------------------------------------------------

export type InviteError = "firstName" | "email" | "full" | "taken";

/**
 * Adds a member (only the primary may; the route checks that) and returns the invite mail to send. Fails when the
 * budget already has MAX_LOGINS e-mails, or the e-mail already logs in anywhere (this budget or another one).
 */
export async function addMember(
  accountId: string,
  input: { firstName?: unknown; email?: unknown },
  now = new Date(),
  dir?: string,
): Promise<{ ok: true; link: Link } | { ok: false; error: InviteError }> {
  const firstName = typeof input.firstName === "string" ? input.firstName.trim().replace(/\s+/g, " ") : "";
  const email = normalizeEmail(input.email);
  if (!firstName || firstName.length > 60) return { ok: false, error: "firstName" };
  if (!isEmail(email)) return { ok: false, error: "email" };
  const a = await readAccount(accountId, dir);
  if (!a?.verifiedAt) return { ok: false, error: "full" };
  if (1 + (a.members?.length ?? 0) >= MAX_LOGINS) return { ok: false, error: "full" };
  if (await findLogin(email, dir)) return { ok: false, error: "taken" };
  const m: Member = { id: newMemberId(), firstName, email, invitedAt: now.toISOString() };
  a.members = [...(a.members ?? []), m];
  return { ok: true, link: await issue({ account: a, member: m }, "invite", now, dir) };
}

/** Takes a member off the budget; their links, codes and sessions stop working. False when there was no such member. */
export async function removeMember(accountId: string, memberId: string, dir?: string): Promise<boolean> {
  const a = await readAccount(accountId, dir);
  if (!a?.members?.some((m) => m.id === memberId)) return false;
  a.members = a.members.filter((m) => m.id !== memberId);
  if (!a.members.length) delete a.members;
  await saveAccount(a, dir);
  return true;
}

/** Who can log in to the budget, for the app's Deling page (no tokens). */
export function listLogins(a: Account) {
  return {
    max: MAX_LOGINS,
    primary: { name: displayName(a), email: a.email },
    members: (a.members ?? []).map((m) => ({ id: m.id, name: m.firstName, email: m.email, pending: !m.verifiedAt })),
  };
}
