/**
 * Kundeadmins on /aftale: the people at a school, bank or estate agent who hand out the agreement's seats
 * (lib/agreements.ts). Who is a kundeadmin is only decided by the owner ledger – an e-mail in an Org's `admins` – so
 * removing the e-mail there (on /admin, or by a colleague) ends the access at once, even with a live session.
 *
 * Logins work like the teachers' (lib/skole-teachers.ts): no passwords, a mail with a 6-digit code and a link.
 *
 *   aftaler/admins/<id>.json   { id, email, createdAt, verifiedAt?, token?, lastMailAt? }
 *
 * The id is made from the e-mail ("k-" + 16 hex), so no e-mail index is needed. Only hashes of the link secret and
 * the code are stored; using one spends both, a new mail replaces the previous one, and MAX_ADMIN_CODE_TRIES wrong
 * codes spend them.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { listGrants, type Grant } from "./agreements";
import { openStore } from "./kv";
import { MAX_ORG_ADMINS, parseAdmins, today, type Ledger, type Org, type OrgCategory } from "./owner";
import { readLedger, writeLedger } from "./owner-store";
import { isEmail, normalizeEmail } from "./signup";

export const ADMIN_LOGIN_TTL_MS = 20 * 60 * 1000;
export const ADMIN_RESEND_GAP_MS = 60 * 1000;
export const MAX_ADMIN_CODE_TRIES = 5;

export interface AgreementAdmin {
  id: string;
  email: string;
  createdAt: string;
  verifiedAt?: string;
  token?: { hash: string; code: string; tries: number; expires: string };
  lastMailAt?: string;
}

export interface AdminMail {
  admin: AgreementAdmin;
  token: string;
  code: string;
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const adminId = (email: string) => `k-${hash(`budgetpro-kundeadmin:${normalizeEmail(email)}`).slice(0, 16)}`;
export const isAdminId = (id: unknown): id is string => typeof id === "string" && /^k-[0-9a-f]{16}$/.test(id);
const adminKey = (id: string) => `aftaler/admins/${id}.json`;
const codeHash = (a: AgreementAdmin, code: string) => hash(`${a.id}:${code}`);
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

export async function readAdmin(id: string, dir?: string): Promise<AgreementAdmin | null> {
  if (!isAdminId(id)) return null;
  return parse<AgreementAdmin>(await openStore(dir).get(adminKey(id)));
}

const saveAdmin = (a: AgreementAdmin, dir?: string) => openStore(dir).set(adminKey(a.id), JSON.stringify(a));

/** The agreements this e-mail is kundeadmin of. */
export const orgsOf = (ledger: Ledger, email: string): Org[] => {
  const e = normalizeEmail(email);
  return e ? ledger.orgs.filter((o) => o.admins?.includes(e)) : [];
};

/** A login mail for a kundeadmin's e-mail; null when the e-mail is no kundeadmin, or a mail went out just now. */
export async function requestAdminLogin(email: unknown, now = new Date(), dir?: string): Promise<AdminMail | null> {
  const e = normalizeEmail(email);
  if (!isEmail(e) || !orgsOf(await readLedger(dir), e).length) return null;
  const a: AgreementAdmin = (await readAdmin(adminId(e), dir)) ?? { id: adminId(e), email: e, createdAt: now.toISOString() };
  if (a.lastMailAt && now.getTime() - Date.parse(a.lastMailAt) < ADMIN_RESEND_GAP_MS) return null;
  const secret = randomBytes(24).toString("base64url");
  const code = String(randomInt(1_000_000)).padStart(6, "0");
  a.token = { hash: hash(secret), code: codeHash(a, code), tries: 0, expires: new Date(now.getTime() + ADMIN_LOGIN_TTL_MS).toISOString() };
  a.lastMailAt = now.toISOString();
  await saveAdmin(a, dir);
  return { admin: a, token: `${a.id}.${secret}`, code };
}

async function use(a: AgreementAdmin, now: Date, dir?: string): Promise<AgreementAdmin> {
  delete a.token;
  a.verifiedAt ??= now.toISOString();
  await saveAdmin(a, dir);
  return a;
}

/** Uses a mailed link. Null for an unknown, used or expired link. */
export async function redeemAdminLink(token: unknown, now = new Date(), dir?: string): Promise<AgreementAdmin | null> {
  if (typeof token !== "string") return null;
  const m = /^(k-[0-9a-f]{16})\.([\w-]+)$/.exec(token);
  if (!m) return null;
  const a = await readAdmin(m[1]!, dir);
  if (!a?.token || !same(a.token.hash, hash(m[2]!)) || !(Date.parse(a.token.expires) > now.getTime())) return null;
  return use(a, now, dir);
}

/** Uses the code from the mail, typed where it was asked for. Null for a wrong, used or expired code. */
export async function redeemAdminCode(email: unknown, code: unknown, now = new Date(), dir?: string): Promise<AgreementAdmin | null> {
  const digits = typeof code === "string" ? code.replace(/\s/g, "") : "";
  const e = normalizeEmail(email);
  if (!/^\d{6}$/.test(digits) || !isEmail(e)) return null;
  const a = await readAdmin(adminId(e), dir);
  if (!a?.token || !(Date.parse(a.token.expires) > now.getTime())) return null;
  if (same(a.token.code, codeHash(a, digits))) return use(a, now, dir);
  a.token.tries += 1;
  if (a.token.tries >= MAX_ADMIN_CODE_TRIES) delete a.token;
  await saveAdmin(a, dir);
  return null;
}

/** The logged-in kundeadmin and the agreements they may run (none = no access any more). */
export async function adminWithOrgs(id: string | null, dir?: string): Promise<{ admin: AgreementAdmin; orgs: Org[] } | null> {
  const admin = id ? await readAdmin(id, dir) : null;
  if (!admin?.verifiedAt) return null;
  const orgs = orgsOf(await readLedger(dir), admin.email);
  return orgs.length ? { admin, orgs } : null;
}

export type ColleagueResult = { ok: true; org: Org; added?: string } | { ok: false; error: "email" | "max" | "exists" | "self" | "unknown" | "org" };

/** A kundeadmin adds a colleague as kundeadmin of the same agreement (max MAX_ORG_ADMINS). */
export async function addColleague(orgId: string, by: string, email: unknown, dir?: string): Promise<ColleagueResult> {
  const e = normalizeEmail(email);
  if (!isEmail(e)) return { ok: false, error: "email" };
  const ledger = await readLedger(dir);
  const org = ledger.orgs.find((o) => o.id === orgId);
  if (!org?.admins?.includes(normalizeEmail(by))) return { ok: false, error: "org" };
  if (org.admins.includes(e)) return { ok: false, error: "exists" };
  if (org.admins.length >= MAX_ORG_ADMINS) return { ok: false, error: "max" };
  org.admins = parseAdmins([...org.admins, e])!;
  await writeLedger(ledger, dir);
  return { ok: true, org, added: e };
}

/** A kundeadmin removes a colleague (not themselves – that keeps an agreement from ending up without kundeadmins). */
export async function removeColleague(orgId: string, by: string, email: unknown, dir?: string): Promise<ColleagueResult> {
  const e = normalizeEmail(email);
  const ledger = await readLedger(dir);
  const org = ledger.orgs.find((o) => o.id === orgId);
  if (!org?.admins?.includes(normalizeEmail(by))) return { ok: false, error: "org" };
  if (e === normalizeEmail(by)) return { ok: false, error: "self" };
  if (!org.admins.includes(e)) return { ok: false, error: "unknown" };
  org.admins = org.admins.filter((x) => x !== e);
  await writeLedger(ledger, dir);
  return { ok: true, org };
}

// ---- What /aftale shows (never a code, never a price) ------------------------------------------------------------

export type GrantStatus = "sent" | "lapsed" | "active" | "ended";

export interface GrantRow {
  id: string;
  email: string;
  sentAt: string;
  lastSentAt: string;
  status: GrantStatus;
  usedAt?: string;
  until?: string;
  /** Unused and still within the pack's last day: can be sent again or withdrawn. */
  open: boolean;
  /** A school's teacher using the seat: the school can take it back for another teacher. */
  release: boolean;
  /** The kundeadmins' own note (Grant.note). */
  note?: string;
}

export interface AgreementView {
  id: string;
  name: string;
  category: OrgCategory;
  me: string;
  admins: string[];
  maxAdmins: number;
  packs: { id: string; count: number; months: number; sendBy: string; sent: number; used: number; open: boolean }[];
  /** free = seats that can be sent today. */
  seats: { count: number; sent: number; used: number; free: number };
  grants: GrantRow[];
}

export function grantRow(g: Grant, day: string, school = false): GrantRow {
  const lastSentAt = g.sends.at(-1) ?? g.sentAt;
  const note = g.note ? { note: g.note } : {};
  if (g.usedBy) {
    const status = g.until && g.until > day ? "active" : "ended";
    return { id: g.id, email: g.email, sentAt: g.sentAt, lastSentAt, status, usedAt: g.usedAt, until: g.until, open: false, release: school && status === "active", ...note };
  }
  const open = day <= g.sendBy;
  return { id: g.id, email: g.email, sentAt: g.sentAt, lastSentAt, status: open ? "sent" : "lapsed", open, release: false, ...note };
}

export function buildAgreementView(org: Org, me: string, grants: Grant[], now = new Date()): AgreementView {
  const day = today(now);
  const packs = [...(org.packs ?? [])]
    .sort((a, b) => a.bought.localeCompare(b.bought))
    .map((p) => {
      const mine = grants.filter((g) => g.pack === p.id);
      return {
        id: p.id,
        count: p.count,
        months: p.months,
        sendBy: p.sendBy,
        sent: mine.length,
        used: mine.filter((g) => g.usedBy).length,
        open: p.bought <= day && day <= p.sendBy,
      };
    });
  return {
    id: org.id,
    name: org.name,
    category: org.category,
    me: normalizeEmail(me),
    admins: org.admins ?? [],
    maxAdmins: MAX_ORG_ADMINS,
    packs,
    seats: {
      count: packs.reduce((s, p) => s + p.count, 0),
      sent: packs.reduce((s, p) => s + p.sent, 0),
      used: packs.reduce((s, p) => s + p.used, 0),
      free: packs.filter((p) => p.open).reduce((s, p) => s + Math.max(0, p.count - p.sent), 0),
    },
    grants: grants.map((g) => grantRow(g, day, org.category === "skole")).sort((a, b) => b.lastSentAt.localeCompare(a.lastSentAt)),
  };
}

export async function loadAgreementView(org: Org, me: string, now = new Date(), dir?: string): Promise<AgreementView> {
  return buildAgreementView(org, me, await listGrants(org.id, dir), now);
}
