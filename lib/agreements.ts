/**
 * Agreement seats (aftaler). An organisation in the owner ledger (lib/owner.ts) buys packs of seats (X seats × Y
 * months); its kundeadmins hand them out by typing an e-mail – budgetpro mails that person a code and a link. Each seat
 * sent is a grant:
 *
 *   aftaler/<orgId>/adgange/<grantId>.json  Grant
 *   aftaler/koder/<sha256(code)>.json        { org, grant }   finds the grant from a typed code
 *   aftaler/brugt/<grantId>.json             holder id        written once with add(), so a seat is only taken once
 *
 * Nobody ever sees a code – not the kundeadmin, not the owner, no API. It is made from the grant id with the session
 * key (keyedHash in lib/session.ts), put in the mail, and made again for "send igen"; only its hash is stored. A new
 * AUTH_SECRET gives new codes, so codes in mails sent before stop working.
 *
 * A seat's months count from the day it is taken; `until` is the first day without access. An unused grant can be
 * withdrawn (the seat comes back). Seats are taken from the oldest pack that can still send.
 */
import { createHash } from "node:crypto";
import { openStore } from "./kv";
import { addMonths, today, type Org, type Pack, type PackUse } from "./owner";
import { keyedHash } from "./session";
import { isEmail, normalizeEmail } from "./signup";

/** "Send igen" to the same e-mail at most this many times in 24 hours. */
export const MAX_SENDS_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface Grant {
  id: string;
  org: string;
  pack: string;
  email: string;
  /** Copied from the pack when sent. */
  months: number;
  sendBy: string;
  /** ISO times the mail was sent (the first one, and the last day's resends). */
  sentAt: string;
  sends: string[];
  /** Account id or teacher id that took the seat. */
  usedBy?: string;
  usedAt?: string;
  /** YYYY-MM-DD, the first day without access. */
  until?: string;
  /** The kundeadmins' own note, e.g. a case number. Never in a mail and never shown to the customer. */
  note?: string;
}

/** How many e-mails one "Giv adgang til flere" may send at once (mails go out one by one, paced for Resend). */
export const MAX_BATCH = 50;
export const MAX_NOTE = 80;

// No 0/O/1/I: the code is read from a mail and maybe typed by hand. 32 letters, so a byte % 32 is even.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const grantKey = (org: string, id: string) => `aftaler/${org}/adgange/${id}.json`;
const codeKey = (code: string) => `aftaler/koder/${sha(`budgetpro-aftale:${code}`)}.json`;
const usedKey = (id: string) => `aftaler/brugt/${id}.json`;
const newId = () => "g-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

/** The code as it is written in the mail: ABCD-EFGH. */
export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** A typed code without spaces, dashes and case; null when it can't be a code. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === CODE_LENGTH && [...s].every((ch) => ALPHABET.includes(ch)) ? s : null;
}

export async function grantCode(grantId: string, dir?: string): Promise<string> {
  const bytes = await keyedHash(`budgetpro-aftale-kode:${grantId}`, dir);
  return Array.from(bytes.subarray(0, CODE_LENGTH), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function parse<T>(text: string | null): T | null {
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export async function readGrant(orgId: string, id: string, dir?: string): Promise<Grant | null> {
  return parse<Grant>(await openStore(dir).get(grantKey(orgId, id)));
}

const saveGrant = (g: Grant, dir?: string) => openStore(dir).set(grantKey(g.org, g.id), JSON.stringify(g));

export async function listGrants(orgId: string, dir?: string): Promise<Grant[]> {
  const store = openStore(dir);
  const names = (await store.list(`aftaler/${orgId}/adgange`)).filter((n) => n.endsWith(".json"));
  const all = await Promise.all(names.map((n) => readGrant(orgId, n.slice(0, -5), dir)));
  return all.filter((g): g is Grant => !!g).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

/** Seats sent and used per pack. */
export function packUse(grants: Grant[]): PackUse {
  const use: PackUse = {};
  for (const g of grants) {
    const u = (use[g.pack] ??= { sent: 0, used: 0 });
    u.sent++;
    if (g.usedBy) u.used++;
  }
  return use;
}

export async function loadPackUse(orgs: Org[], dir?: string): Promise<PackUse> {
  const lists = await Promise.all(orgs.filter((o) => o.packs?.length).map((o) => listGrants(o.id, dir)));
  return packUse(lists.flat());
}

/** The oldest pack that can still send a seat today. */
export function openPack(org: Org, use: PackUse, day: string): Pack | null {
  const packs = [...(org.packs ?? [])].sort((a, b) => a.bought.localeCompare(b.bought));
  return packs.find((p) => p.bought <= day && day <= p.sendBy && (use[p.id]?.sent ?? 0) < p.count) ?? null;
}

export type Sent = { ok: true; grant: Grant; code: string; again: boolean } | { ok: false; error: "email" | "used" | "full" | "limit" | "unknown" };

/**
 * A kundeadmin gives a seat to an e-mail. The same e-mail again sends the same code again; an e-mail that already took
 * a seat here gets "used". The caller mails `code` – it must never be shown or returned to the kundeadmin.
 */
export async function giveAccess(org: Org, email: string, now = new Date(), dir?: string): Promise<Sent> {
  const to = normalizeEmail(email);
  if (!isEmail(to)) return { ok: false, error: "email" };
  const grants = await listGrants(org.id, dir);
  const mine = grants.find((g) => g.email === to);
  if (mine) return mine.usedBy ? { ok: false, error: "used" } : sendAgain(org.id, mine.id, now, dir);
  const pack = openPack(org, packUse(grants), today(now));
  if (!pack) return { ok: false, error: "full" };
  return { ok: true, ...(await newGrant(org, pack, to, now, dir)), again: false };
}

async function newGrant(org: Org, pack: Pack, to: string, now: Date, dir?: string, note?: string): Promise<{ grant: Grant; code: string }> {
  const at = now.toISOString();
  const grant: Grant = { id: newId(), org: org.id, pack: pack.id, email: to, months: pack.months, sendBy: pack.sendBy, sentAt: at, sends: [at], ...(note ? { note } : {}) };
  const code = await grantCode(grant.id, dir);
  await openStore(dir).set(codeKey(code), JSON.stringify({ org: org.id, grant: grant.id }));
  await saveGrant(grant, dir);
  return { grant, code };
}

export type ManyResult = { email: string; result: "sent" | "exists" | "used" | "full" | "email"; grant?: Grant; code?: string };

/**
 * Seats for many e-mails at once (at most MAX_BATCH new ones). Unlike giveAccess, an e-mail that already has a seat
 * is left alone ("exists"), so the same list can be sent twice without mailing anyone again. Lists the grants once.
 * The caller mails each `code` – never shown or returned to the kundeadmin.
 */
export async function giveAccessMany(org: Org, emails: string[], now = new Date(), dir?: string, note?: string): Promise<ManyResult[]> {
  const grants = await listGrants(org.id, dir);
  const use = packUse(grants), day = today(now), out: ManyResult[] = [];
  let made = 0;
  for (const raw of emails) {
    const to = normalizeEmail(raw);
    if (out.some((r) => r.email === to)) continue;
    if (!isEmail(to)) {
      out.push({ email: raw.trim(), result: "email" });
      continue;
    }
    const mine = grants.find((g) => g.email === to);
    if (mine) {
      out.push({ email: to, result: mine.usedBy ? "used" : "exists" });
      continue;
    }
    const pack = made < MAX_BATCH ? openPack(org, use, day) : null;
    if (!pack) {
      out.push({ email: to, result: "full" });
      continue;
    }
    const { grant, code } = await newGrant(org, pack, to, now, dir, note);
    (use[pack.id] ??= { sent: 0, used: 0 }).sent++;
    grants.push(grant);
    made++;
    out.push({ email: to, result: "sent", grant, code });
  }
  return out;
}

/** The kundeadmins' note on a seat ("" removes it). */
export async function setGrantNote(orgId: string, grantId: string, note: unknown, dir?: string): Promise<Grant | null> {
  const grant = await readGrant(orgId, grantId, dir);
  if (!grant) return null;
  const clean = typeof note === "string" ? note.trim().replace(/\s+/g, " ").slice(0, MAX_NOTE) : "";
  if (clean) grant.note = clean;
  else delete grant.note;
  await saveGrant(grant, dir);
  return grant;
}

/** The same code to the same e-mail again, at most MAX_SENDS_PER_DAY times in 24 hours. */
export async function sendAgain(orgId: string, grantId: string, now = new Date(), dir?: string): Promise<Sent> {
  const grant = await readGrant(orgId, grantId, dir);
  if (!grant) return { ok: false, error: "unknown" };
  if (grant.usedBy) return { ok: false, error: "used" };
  const recent = grant.sends.filter((t) => now.getTime() - Date.parse(t) < DAY_MS);
  if (recent.length >= MAX_SENDS_PER_DAY) return { ok: false, error: "limit" };
  grant.sends = [...recent, now.toISOString()];
  await saveGrant(grant, dir);
  return { ok: true, grant, code: await grantCode(grant.id, dir), again: true };
}

/** Takes back a seat nobody has used yet (e.g. a typo in the e-mail); the seat is free again. */
export async function withdrawGrant(orgId: string, grantId: string, dir?: string): Promise<{ ok: boolean; error?: "unknown" | "used" }> {
  const store = openStore(dir);
  const grant = await readGrant(orgId, grantId, dir);
  if (!grant) return { ok: false, error: "unknown" };
  if (grant.usedBy || (await store.get(usedKey(grant.id))) !== null) return { ok: false, error: "used" };
  await store.del(codeKey(await grantCode(grant.id, dir)));
  await store.del(grantKey(orgId, grantId));
  return { ok: true };
}

/** Finds the grant behind a typed code (or the code in a mail link). */
export async function findGrant(input: unknown, dir?: string): Promise<Grant | null> {
  const code = normalizeCode(input);
  if (!code) return null;
  const ref = parse<{ org: string; grant: string }>(await openStore(dir).get(codeKey(code)));
  return ref ? readGrant(ref.org, ref.grant, dir) : null;
}

export type Taken = { ok: true; grant: Grant } | { ok: false; error: "unknown" | "used" | "expired" };

/** A user (account id or teacher id) takes the seat behind a code. Works once, and only until the pack's last day. */
export async function useCode(input: unknown, holder: string, now = new Date(), dir?: string): Promise<Taken> {
  const grant = await findGrant(input, dir);
  if (!grant) return { ok: false, error: "unknown" };
  if (grant.usedBy) return grant.usedBy === holder ? { ok: true, grant } : { ok: false, error: "used" };
  const day = today(now);
  if (day > grant.sendBy) return { ok: false, error: "expired" };
  if (!(await openStore(dir).add(usedKey(grant.id), holder))) return { ok: false, error: "used" };
  const taken: Grant = { ...grant, usedBy: holder, usedAt: now.toISOString(), until: addMonths(day, grant.months) };
  await saveGrant(taken, dir);
  return { ok: true, grant: taken };
}

/** A school takes a seat back from a teacher who no longer needs it: the grant goes, and the seat is free again. */
export async function releaseSeat(orgId: string, grantId: string, dir?: string): Promise<{ ok: boolean; error?: "unknown" }> {
  const store = openStore(dir);
  const grant = await readGrant(orgId, grantId, dir);
  if (!grant) return { ok: false, error: "unknown" };
  await store.del(codeKey(await grantCode(grant.id, dir)));
  await store.del(usedKey(grant.id));
  await store.del(grantKey(orgId, grantId));
  return { ok: true };
}

/** A seat sent to this e-mail in one of these agreements that is not used yet and can still be taken. */
export async function waitingGrant(orgIds: string[], email: string, now = new Date(), dir?: string): Promise<Grant | null> {
  const to = normalizeEmail(email);
  const day = today(now);
  for (const id of orgIds) {
    const g = (await listGrants(id, dir)).find((x) => x.email === to && !x.usedBy && day <= x.sendBy);
    if (g) return g;
  }
  return null;
}
