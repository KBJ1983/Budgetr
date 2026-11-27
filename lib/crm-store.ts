/**
 * Storage for the owner's sales CRM (rules in lib/crm.ts): one file per lead, "crm/leads/<id>.json", and a list of
 * their summaries, "crm/index.json", so /admin can show the whole list with one read. Every write of a lead also
 * updates its line in the list. Only the owner writes here (through /api/owner/crm), one change at a time.
 */
import { openStore } from "./kv";
import {
  LEAD_ID,
  MAX_MAILS_PER_DAY,
  applyCrmChange,
  checkMail,
  logMail,
  mergeResearch,
  newLead,
  slugId,
  summarize,
  toLead,
  type CrmError,
  type Lead,
  type LeadSummary,
  type MailCheck,
} from "./crm";

const INDEX = "crm/index.json";
const FOLDER = "crm/leads";
const leadKey = (id: string) => `${FOLDER}/${id}.json`;

async function readIndex(dir?: string): Promise<LeadSummary[] | null> {
  try {
    const x = JSON.parse((await openStore(dir).get(INDEX)) ?? "null");
    return Array.isArray(x) ? (x as LeadSummary[]) : null;
  } catch {
    return null;
  }
}
const writeIndex = (rows: LeadSummary[], dir?: string) => openStore(dir).set(INDEX, JSON.stringify(rows));

export async function getLead(id: unknown, dir?: string): Promise<Lead | null> {
  if (typeof id !== "string" || !LEAD_ID.test(id)) return null;
  try {
    return toLead(JSON.parse((await openStore(dir).get(leadKey(id))) ?? "null"));
  } catch {
    return null;
  }
}

/** Reads every lead file and writes the list again (also used when the list is missing). */
export async function rebuildIndex(dir?: string): Promise<LeadSummary[]> {
  const names = (await openStore(dir).list(FOLDER)).filter((n) => n.endsWith(".json"));
  const rows: LeadSummary[] = [];
  for (let i = 0; i < names.length; i += 25) {
    const leads = await Promise.all(names.slice(i, i + 25).map((n) => getLead(n.slice(0, -5), dir)));
    for (const l of leads) if (l) rows.push(summarize(l));
  }
  await writeIndex(rows, dir);
  return rows;
}

export async function listLeads(dir?: string): Promise<LeadSummary[]> {
  return (await readIndex(dir)) ?? (await rebuildIndex(dir));
}

async function saveLead(lead: Lead, dir?: string): Promise<LeadSummary> {
  await openStore(dir).set(leadKey(lead.id), JSON.stringify(lead));
  const rows = (await readIndex(dir)) ?? [];
  const s = summarize(lead);
  const at = rows.findIndex((r) => r.id === lead.id);
  if (at >= 0) rows[at] = s;
  else rows.push(s);
  await writeIndex(rows, dir);
  return s;
}

export type StoreResult = { ok: true; lead: Lead } | { ok: false; error: CrmError };

/** Merges a research file (`{ leads: [...] }` or a plain list) into the CRM; the owner's own work is kept. */
export async function importResearch(file: unknown, now = new Date(), dir?: string): Promise<{ added: number; updated: number; skipped: number }> {
  const list = Array.isArray(file) ? file : file && typeof file === "object" && Array.isArray((file as { leads?: unknown }).leads) ? (file as { leads: unknown[] }).leads : [];
  const at = now.toISOString();
  let added = 0, updated = 0, skipped = 0;
  for (let i = 0; i < list.length; i += 20) {
    await Promise.all(
      list.slice(i, i + 20).map(async (x) => {
        const id = x && typeof x === "object" ? (x as { id?: unknown }).id : undefined;
        const stored = await getLead(id, dir);
        const merged = mergeResearch(stored, x, at);
        if (!merged) return skipped++;
        await openStore(dir).set(leadKey(merged.id), JSON.stringify(merged));
        return stored ? updated++ : added++;
      }),
    );
  }
  await rebuildIndex(dir);
  return { added, updated, skipped };
}

export async function changeLead(id: unknown, change: unknown, now = new Date(), dir?: string): Promise<StoreResult> {
  const lead = await getLead(id, dir);
  if (!lead) return { ok: false, error: "lead" };
  const r = applyCrmChange(lead, change, now.toISOString());
  if (!r.ok) return r;
  await saveLead(r.lead, dir);
  return r;
}

/** A lead made on /admin; its id is "egen-<name>", with a number added when that is taken. */
export async function createLead(input: unknown, now = new Date(), dir?: string): Promise<StoreResult> {
  const name = input && typeof input === "object" ? String((input as { name?: unknown }).name ?? "") : "";
  const base = slugId("egen", name);
  let id = base;
  for (let n = 2; await getLead(id, dir); n++) id = `${base}-${n}`;
  const r = newLead(input, id, now.toISOString());
  if (!r.ok) return r;
  await saveLead(r.lead, dir);
  return r;
}

export async function deleteLead(id: unknown, dir?: string): Promise<boolean> {
  const lead = await getLead(id, dir);
  if (!lead) return false;
  await openStore(dir).del(leadKey(lead.id));
  await writeIndex(((await readIndex(dir)) ?? []).filter((r) => r.id !== lead.id), dir);
  return true;
}

export type MailResult = { ok: true; lead: Lead; sent: boolean } | { ok: false; error: CrmError | Extract<MailCheck, { ok: false }>["error"] };

/**
 * Mails one of a lead's contacts (`mail` sends it – lib/auth-mail.ts' sendMail in the route; false = no mail
 * provider) and keeps it in the timeline either way. At most MAX_MAILS_PER_DAY from the CRM in all per day.
 */
export async function mailLead(
  id: unknown,
  input: { contactId?: unknown; subject?: unknown; text?: unknown; consent?: unknown; outcome?: unknown; months?: unknown },
  mail: (to: string, subject: string, text: string) => Promise<boolean>,
  now = new Date(),
  dir?: string,
): Promise<MailResult> {
  const lead = await getLead(id, dir);
  if (!lead) return { ok: false, error: "lead" };
  const m = checkMail(lead, input, now);
  if (!m.ok) return m;
  if ((await openStore(dir).hit("crm/mails-day", 24 * 3600)) > MAX_MAILS_PER_DAY) return { ok: false, error: "mailLimit" };
  const sent = await mail(m.to, m.subject, m.text);
  const next = logMail(lead, m, sent, now.toISOString());
  await saveLead(next, dir);
  return { ok: true, lead: next, sent };
}
