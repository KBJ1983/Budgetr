/**
 * The owner's inbox for henvendelser from the Erhverv form (saved by lib/erhverv-store.ts as
 * "erhverv/henvendelser/<id>.json"). A new one is waiting ("venter") until the owner makes an agreement from it on
 * /admin or marks it as done; both keep the henvendelse, with when and – for an agreement – which organisation.
 */
import { openStore } from "./kv";

const FOLDER = "erhverv/henvendelser";

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
  /** Set when the owner has dealt with it. */
  doneAt?: string;
  /** The agreement made from it. */
  org?: string;
}

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
    doneAt: str(o.doneAt) || undefined,
    org: str(o.org) || undefined,
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

/** Marks one as done (optionally with the agreement made from it), or opens it again. False when it isn't there. */
export async function markInquiry(id: unknown, done: boolean, org?: string, now = new Date(), dir?: string): Promise<boolean> {
  if (typeof id !== "string" || !ID.test(id)) return false;
  const store = openStore(dir), key = `${FOLDER}/${id}.json`;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse((await store.get(key)) ?? "null");
  } catch {
    return false;
  }
  if (!o || typeof o !== "object") return false;
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
