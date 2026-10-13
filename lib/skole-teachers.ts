/**
 * budgetpro Skole's teacher logins (the classes are in lib/skole-store.ts). No passwords: a teacher signs up with
 * name, school and e-mail, and every login goes through a mail with a 6-digit code and a link – the same scheme as
 * the budget accounts in lib/accounts.ts, kept apart from them:
 *
 *   skole/laerer-konti/<id>.json    { id, name, school, email, createdAt, verifiedAt?, token?, lastMailAt? }
 *   skole/laerer-mail/<hash>.json   { id }   finds the teacher by e-mail
 *
 * The link holds "<id>.<random>"; only hashes of the random part and of the code are stored. Link and code work once
 * (using one spends both), a new mail replaces the previous one, and MAX_TEACHER_CODE_TRIES wrong codes spend them.
 * The first time a teacher logs in, the classes they made with the same e-mail before there were logins become theirs.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { openStore } from "./kv";
import { normalizeEmail } from "./signup";
import type { TeacherInput } from "./skole";
import { adoptLegacyClasses } from "./skole-store";

export const TEACHER_LOGIN_TTL_MS = 20 * 60 * 1000;
/** No new mail to the same teacher within this gap. */
export const TEACHER_RESEND_GAP_MS = 60 * 1000;
export const MAX_TEACHER_CODE_TRIES = 5;

export interface Teacher {
  id: string;
  name: string;
  school: string;
  email: string;
  createdAt: string;
  verifiedAt?: string;
  token?: { hash: string; code: string; tries: number; expires: string };
  lastMailAt?: string;
}

/** A mail to send: "signup" until the e-mail is confirmed, then "login". */
export interface TeacherMail {
  teacher: Teacher;
  purpose: "signup" | "login";
  token: string;
  code: string;
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const accountKey = (id: string) => `skole/laerer-konti/${id}.json`;
const emailKey = (email: string) => `skole/laerer-mail/${hash(`budgetpro-skole-login:${normalizeEmail(email)}`)}.json`;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const newId = () => `t-${Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;
export const isTeacherId = (id: unknown): id is string => typeof id === "string" && /^t-[a-z0-9]{10}$/.test(id);
const newCode = () => String(randomInt(1_000_000)).padStart(6, "0");
// Hashed with the teacher id, so equal codes for two teachers don't look alike.
const codeHash = (t: Teacher, code: string) => hash(`${t.id}:${code}`);
const same = (a: string, b: string) => {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
};

function parse<T>(text: string | null): T | null {
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export async function readTeacher(id: string, dir?: string): Promise<Teacher | null> {
  if (!isTeacherId(id)) return null;
  return parse<Teacher>(await openStore(dir).get(accountKey(id)));
}

async function saveTeacher(t: Teacher, dir?: string): Promise<void> {
  await openStore(dir).set(accountKey(t.id), JSON.stringify(t));
}

export async function findTeacher(email: unknown, dir?: string): Promise<Teacher | null> {
  const e = normalizeEmail(email);
  if (!e) return null;
  const ref = parse<{ id: string }>(await openStore(dir).get(emailKey(e)));
  return ref ? readTeacher(ref.id, dir) : null;
}

const throttled = (t: Teacher, now: Date) => !!t.lastMailAt && now.getTime() - Date.parse(t.lastMailAt) < TEACHER_RESEND_GAP_MS;

/** Gives the teacher a fresh link and code (replacing earlier ones) and saves. */
async function issue(t: Teacher, now: Date, dir?: string): Promise<TeacherMail> {
  const secret = randomBytes(24).toString("base64url");
  const code = newCode();
  t.token = { hash: hash(secret), code: codeHash(t, code), tries: 0, expires: new Date(now.getTime() + TEACHER_LOGIN_TTL_MS).toISOString() };
  t.lastMailAt = now.toISOString();
  await saveTeacher(t, dir);
  return { teacher: t, purpose: t.verifiedAt ? "login" : "signup", token: `${t.id}.${secret}`, code };
}

/**
 * Signs a teacher up, or – when the e-mail is already a teacher – hands out a login mail (a confirmed teacher keeps
 * their details; an unconfirmed one takes the new ones). Null when a mail went out less than TEACHER_RESEND_GAP_MS ago.
 */
export async function signupTeacher(input: TeacherInput, now = new Date(), dir?: string): Promise<TeacherMail | null> {
  const existing = await findTeacher(input.email, dir);
  if (existing) {
    if (throttled(existing, now)) return null;
    if (!existing.verifiedAt) Object.assign(existing, { name: input.name, school: input.school });
    return issue(existing, now, dir);
  }
  const t: Teacher = { id: newId(), name: input.name, school: input.school, email: normalizeEmail(input.email), createdAt: now.toISOString() };
  await openStore(dir).set(emailKey(t.email), JSON.stringify({ id: t.id }));
  return issue(t, now, dir);
}

/** A login mail for this e-mail, or null for no teacher / throttled. */
export async function requestTeacherLogin(email: unknown, now = new Date(), dir?: string): Promise<TeacherMail | null> {
  const t = await findTeacher(email, dir);
  if (!t || throttled(t, now)) return null;
  return issue(t, now, dir);
}

/** Spends the link and code; the first use confirms the e-mail and brings over the teacher's earlier classes. */
async function use(t: Teacher, now: Date, dir?: string): Promise<Teacher> {
  delete t.token;
  if (!t.verifiedAt) {
    t.verifiedAt = now.toISOString();
    await adoptLegacyClasses(t.id, t.email, now, dir);
  }
  await saveTeacher(t, dir);
  return t;
}

/** Uses a mailed link. Null for an unknown, used or expired link. */
export async function redeemTeacherLink(token: unknown, now = new Date(), dir?: string): Promise<Teacher | null> {
  if (typeof token !== "string") return null;
  const m = /^(t-[a-z0-9]{10})\.([\w-]+)$/.exec(token);
  if (!m) return null;
  const t = await readTeacher(m[1]!, dir);
  if (!t?.token || !same(t.token.hash, hash(m[2]!)) || !(Date.parse(t.token.expires) > now.getTime())) return null;
  return use(t, now, dir);
}

/**
 * Uses the code from the mail, typed on the device that asked for it (spaces are ignored). Null for an unknown
 * e-mail, a wrong, used or expired code, or after MAX_TEACHER_CODE_TRIES wrong tries (which also spends the link).
 */
export async function redeemTeacherCode(email: unknown, code: unknown, now = new Date(), dir?: string): Promise<Teacher | null> {
  const digits = typeof code === "string" ? code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(digits)) return null;
  const t = await findTeacher(email, dir);
  if (!t?.token || !(Date.parse(t.token.expires) > now.getTime())) return null;
  if (same(t.token.code, codeHash(t, digits))) return use(t, now, dir);
  t.token.tries += 1;
  if (t.token.tries >= MAX_TEACHER_CODE_TRIES) delete t.token;
  await saveTeacher(t, dir);
  return null;
}
