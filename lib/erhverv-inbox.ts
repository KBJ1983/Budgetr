/**
 * The owner's inbox for henvendelser from the Erhverv form (saved by lib/erhverv-store.ts as
 * "erhverv/henvendelser/<id>.json"). A new one is waiting ("venter") until the owner makes an agreement from it on
 * /admin or marks it as done; both keep the henvendelse, with when and – for an agreement – which organisation.
 * The owner can also answer it by mail from /admin (each answer is kept on it, `replies`) or delete it for good.
 */
import { openStore } from "./kv";

const FOLDER = "erhverv/henvendelser";

/** One answer the owner wrote from /admin. `sent` is false when no mail provider is set up (the text is kept). */
export interface InquiryReply {
  at: string;
  subject: string;
  text: string;
  sent: boolean;
}

/** Answers per henvendelse within a day, so a double click or a loop never mails a customer again and again. */
export const MAX_REPLIES_PER_DAY = 5;
export const MAX_REPLY_SUBJECT = 150;
export const MAX_REPLY_TEXT = 5_000;

export interface InquiryRow {
  id: string;
  /** ISO time it came in. */
  at: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  sector: string;
  message: string;
  /** The pack they asked about; missing when they want to talk about it first. */
  pack?: { count: number; months: number };
  /** "maaned" or "aar"; missing on henvendelser from before the price calculator. */
  billing?: string;
  /** Set when the owner has dealt with it. */
  doneAt?: string;
  /** The agreement made from it. */
  org?: string;
  /** Where the visit that sent it came from (lib/traffic.ts). */
  source?: string;
  /** The owner's answers from /admin, oldest first. */
  replies: InquiryReply[];
}

const toReply = (x: unknown): InquiryReply | null => {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  return typeof o.at === "string" && typeof o.text === "string"
    ? { at: o.at, subject: typeof o.subject === "string" ? o.subject : "", text: o.text, sent: o.sent === true }
    : null;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const ID = /^[\w-]{1,80}$/;

function toRow(x: unknown): InquiryRow | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (!ID.test(str(o.id)) || !str(o.at)) return null;
  const p = o.pack as Record<string, unknown> | undefined;
  return {
    id: str(o.id),
    at: str(o.at),
    company: str(o.company),
    name: str(o.name),
    email: str(o.email),
    phone: str(o.phone),
    sector: str(o.sector),
    message: str(o.message),
    pack: p && typeof p.count === "number" && typeof p.months === "number" ? { count: p.count, months: p.months } : undefined,
    billing: str(o.billing) || undefined,
    doneAt: str(o.doneAt) || undefined,
    org: str(o.org) || undefined,
    source: str(o.source) || undefined,
    replies: Array.isArray(o.replies) ? o.replies.map(toReply).filter((r): r is InquiryReply => !!r) : [],
  };
}

/** Every henvendelse, newest first. */
export async function listInquiries(dir?: string): Promise<InquiryRow[]> {
  const store = openStore(dir);
  const names = (await store.list(FOLDER)).filter((n) => n.endsWith(".json"));
  const rows = await Promise.all(
    names.map(async (n) => {
      try {
        return toRow(JSON.parse((await store.get(`${FOLDER}/${n}`)) ?? "null"));
      } catch {
        return null;
      }
    }),
  );
  return rows.filter((r): r is InquiryRow => !!r).sort((a, b) => b.at.localeCompare(a.at));
}

/** The stored henvendelse (as saved, all fields) and its key, or null when the id is bad or it isn't there. */
async function readRaw(id: unknown, dir?: string): Promise<{ key: string; o: Record<string, unknown> } | null> {
  if (typeof id !== "string" || !ID.test(id)) return null;
  const key = `${FOLDER}/${id}.json`;
  try {
    const o = JSON.parse((await openStore(dir).get(key)) ?? "null");
    return o && typeof o === "object" ? { key, o } : null;
  } catch {
    return null;
  }
}

/** Deletes one henvendelse for good. False when it isn't there. */
export async function deleteInquiry(id: unknown, dir?: string): Promise<boolean> {
  const r = await readRaw(id, dir);
  if (!r) return false;
  await openStore(dir).del(r.key);
  return true;
}

export type ReplyResult = { ok: true; sent: boolean } | { ok: false; error: "inquiry" | "reply" | "replyLimit" };

/**
 * Answers a henvendelse: `mail` sends it (lib/auth-mail.ts' sendMail in the route; false = no mail provider) and the
 * answer is kept on the henvendelse either way, so it shows on /admin. At most MAX_REPLIES_PER_DAY a day per henvendelse.
 */
export async function replyToInquiry(
  id: unknown,
  input: { subject?: unknown; text?: unknown },
  mail: (to: string, subject: string, text: string, q: InquiryRow) => Promise<boolean>,
  now = new Date(),
  dir?: string,
): Promise<ReplyResult> {
  const r = await readRaw(id, dir);
  const q = r && toRow(r.o);
  if (!r || !q || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(q.email)) return { ok: false, error: "inquiry" };
  const subject = str(input.subject).replace(/[\r\n]+/g, " ").trim().slice(0, MAX_REPLY_SUBJECT);
  const text = str(input.text).replace(/\r\n/g, "\n").trim();
  if (!subject || !text || text.length > MAX_REPLY_TEXT) return { ok: false, error: "reply" };
  const dayAgo = now.getTime() - 24 * 3600_000;
  if (q.replies.filter((x) => Date.parse(x.at) > dayAgo).length >= MAX_REPLIES_PER_DAY) return { ok: false, error: "replyLimit" };
  const sent = await mail(q.email, subject, text, q);
  r.o.replies = [...q.replies, { at: now.toISOString(), subject, text, sent }];
  await openStore(dir).set(r.key, JSON.stringify(r.o, null, 2));
  return { ok: true, sent };
}

/** Marks one as done (optionally with the agreement made from it), or opens it again. False when it isn't there. */
export async function markInquiry(id: unknown, done: boolean, org?: string, now = new Date(), dir?: string): Promise<boolean> {
  const r = await readRaw(id, dir);
  if (!r) return false;
  const store = openStore(dir), key = r.key, o = r.o;
  if (done) {
    o.doneAt = now.toISOString();
    if (org) o.org = org;
  } else {
    delete o.doneAt;
    delete o.org;
  }
  await store.set(key, JSON.stringify(o, null, 2));
  return true;
}
