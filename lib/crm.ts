/**
 * The owner's sales CRM on /admin ("Salg"): leads (banks, estate agents, schools, kommuner), their contact people and
 * a timeline of what was said and sent. Pure rules only – no server imports – so the browser (components/owner/CrmPanel.tsx)
 * and the tests use it too; storage is lib/crm-store.ts.
 *
 * A lead's research part (facts, places, notes, links, and the contacts marked `source: "research"`) comes from a
 * research file imported on /admin; importing again refreshes it and never touches what the owner added or changed
 * (status, own contacts, edited contacts, timeline). The research file is never committed – the repo is public.
 *
 * Logging a call, meeting or mail can set what it led to (`OUTCOMES`): sold, contact again in X months (status
 * "senere" with the follow-up date set), lost/declined, or a step in the pipeline.
 */

export const SEGMENTS = [
  { id: "bank", label: "Banker" },
  { id: "maegler", label: "Ejendomsmæglere" },
  { id: "skole", label: "Skoler" },
  { id: "kommune", label: "Kommuner" },
] as const;
export type Segment = (typeof SEGMENTS)[number]["id"];

export const STATUSES = [
  { id: "ny", label: "Ikke kontaktet" },
  { id: "kontaktet", label: "Kontaktet" },
  { id: "dialog", label: "I dialog" },
  { id: "moede", label: "Møde aftalt" },
  { id: "tilbud", label: "Tilbud sendt" },
  { id: "vundet", label: "Solgt" },
  { id: "senere", label: "Kontakt igen senere" },
  { id: "tabt", label: "Tabt / afslået" },
] as const;
export type LeadStatus = (typeof STATUSES)[number]["id"];
/** The statuses that count as an open conversation (the pipeline). */
export const IN_DIALOG: readonly LeadStatus[] = ["dialog", "moede", "tilbud"];
/** The statuses where the lead is closed for now. */
export const CLOSED: readonly LeadStatus[] = ["vundet", "tabt"];

/**
 * What a call, meeting or mail led to, picked when it is logged: nothing, a step in the pipeline, sold, contact again
 * in some months (the lead waits as "Kontakt igen senere" with the follow-up date set), or lost/declined.
 */
export const OUTCOMES = [
  { id: "", label: "Ingen ændring" },
  { id: "dialog", label: "I dialog" },
  { id: "moede", label: "Møde aftalt" },
  { id: "tilbud", label: "Tilbud sendt" },
  { id: "vundet", label: "Solgt" },
  { id: "senere", label: "Kontakt igen om …" },
  { id: "tabt", label: "Tabt / afslået" },
] as const;
export type Outcome = (typeof OUTCOMES)[number]["id"];
export const AGAIN_MONTHS = [1, 2, 3, 6, 9, 12] as const;

export const EVENT_KINDS = [
  { id: "opkald", label: "Opkald" },
  { id: "moede", label: "Møde" },
  { id: "note", label: "Note" },
  { id: "mail", label: "Mail" },
] as const;
export type EventKind = (typeof EVENT_KINDS)[number]["id"];

export const PRIOS = ["A", "B", "C"] as const;
export type Prio = (typeof PRIOS)[number];

export const MAX_TEXT = 5_000;
export const MAX_SUBJECT = 150;
/** Mails per lead within a day, so a double click or a loop never mails the same people again and again. */
export const MAX_MAILS_PER_LEAD_DAY = 5;
/** Mails from the CRM in all within a day. */
export const MAX_MAILS_PER_DAY = 40;

export interface CrmContact {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  note: string;
  /** "research" until the owner edits it; then "egen", and an import leaves it alone. */
  source: "research" | "egen";
  /** Where a research contact was found. */
  src?: string;
}

export interface CrmEvent {
  id: string;
  at: string;
  kind: EventKind;
  text: string;
  /** The contact it was with (id), when one was picked. */
  contact?: string;
  /** Mails only. */
  subject?: string;
  to?: string;
  /** Mails only: false when no mail provider is set up (the text is kept). */
  sent?: boolean;
  /** The status it led to, when one was picked. */
  outcome?: LeadStatus;
  /** "Kontakt igen om …": the follow-up date it set. */
  again?: string;
}

export interface Fact {
  label: string;
  value: string;
  est?: boolean;
}
export interface Place {
  name?: string;
  town?: string;
  kommune?: string;
  addr?: string;
  phone?: string;
  email?: string;
}

export interface Lead {
  id: string;
  seg: Segment;
  name: string;
  /** Type, e.g. "Lokal bank", "Kæde", "Folkeskole". */
  sub: string;
  place: string;
  kommuner: string[];
  prio: Prio | "";
  prioWhy: string;
  /** A short figure for the list, e.g. "21 butikker i området". */
  metric: string;
  /** Sorts leads with the same priority (customers, shops, classes). */
  sortValue: number;
  facts: Fact[];
  places: Place[];
  placesLabel: string;
  notes: string[];
  links: string[];
  /** "research" when it came from an import, "egen" when made on /admin. */
  source: "research" | "egen";
  status: LeadStatus;
  /** Next follow-up, YYYY-MM-DD. */
  next: string;
  /** Expected value in whole kroner incl. moms (the owner's own guess), 0 when not set. */
  value: number;
  /** Why it was lost or declined (the text of the entry that closed it). */
  lostWhy: string;
  contacts: CrmContact[];
  /** Names of research contacts the owner deleted, so an import doesn't bring them back. */
  dropped: string[];
  events: CrmEvent[];
  created: string;
  updated: string;
}

/** What the list needs; the whole lead is fetched when it is opened. */
export interface LeadSummary {
  id: string;
  seg: Segment;
  name: string;
  sub: string;
  place: string;
  kommuner: string[];
  prio: Prio | "";
  metric: string;
  sortValue: number;
  status: LeadStatus;
  next: string;
  value: number;
  contacts: number;
  /** People names and titles, for the search field. */
  people: string;
  lastAt: string;
  lastKind: EventKind | "";
}

export const LEAD_ID = /^[a-z0-9][a-z0-9-]{0,99}$/;
const ITEM_ID = /^[a-z0-9]{1,24}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");
const line = (v: unknown, max = 200) => str(v, max).replace(/\s*\n\s*/g, " ");
const strs = (v: unknown, max = 500, n = 200) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);
const isSeg = (v: unknown): v is Segment => SEGMENTS.some((s) => s.id === v);
const isStatus = (v: unknown): v is LeadStatus => STATUSES.some((s) => s.id === v);
const isKind = (v: unknown): v is EventKind => EVENT_KINDS.some((s) => s.id === v);
const isPrio = (v: unknown): v is Prio => PRIOS.includes(v as Prio);
const key = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();
const httpsOnly = (u: string) => (/^https:\/\/[^\s]+$/.test(u) ? u : "");
/** Whole kroner from a number or a typed "25.000"; 0 when empty or not a positive number. */
const wholeKr = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[.\s]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 100_000_000) : 0;
};

export const statusLabel = (s: LeadStatus) => STATUSES.find((x) => x.id === s)?.label ?? s;
export const segLabel = (s: Segment) => SEGMENTS.find((x) => x.id === s)?.label ?? s;
export const kindLabel = (k: EventKind) => EVENT_KINDS.find((x) => x.id === k)?.label ?? k;

/** YYYY-MM-DD `months` later (the last day of the month when that day doesn't exist, e.g. 31 Jan + 1 → 28/29 Feb). */
export function addMonthsDay(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}

/** A short random id for contacts and timeline entries. */
export const newItemId = (rnd: () => number = Math.random) =>
  Array.from({ length: 10 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(rnd() * 36)]).join("");

/** A lead id from its name (the caller makes it unique). */
export const slugId = (prefix: string, name: string) =>
  `${prefix}-${name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "lead"}`;

function toContact(x: unknown, source?: "research" | "egen"): CrmContact | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const name = line(o.name, 120);
  if (!name) return null;
  const email = line(o.email, 200);
  const src = httpsOnly(line(o.src ?? o.source_url, 500));
  return {
    id: ITEM_ID.test(str(o.id)) ? str(o.id) : newItemId(),
    name,
    // The research tool kept the role apart ("Skoleleder"); it reads best in front of the title.
    title: [line(o.role, 80), line(o.title, 300)].filter((s, i, a) => s && a.indexOf(s) === i).join(" · "),
    phone: line(o.phone, 40),
    email: EMAIL.test(email) ? email : "",
    note: str(o.note, 1000),
    source: source ?? (o.source === "egen" ? "egen" : "research"),
    ...(src ? { src } : {}),
  };
}

function toEvent(x: unknown): CrmEvent | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (!ITEM_ID.test(str(o.id)) || !str(o.at) || !isKind(o.kind)) return null;
  return {
    id: str(o.id),
    at: str(o.at),
    kind: o.kind,
    text: str(o.text, MAX_TEXT),
    ...(ITEM_ID.test(str(o.contact)) ? { contact: str(o.contact) } : {}),
    ...(o.kind === "mail" ? { subject: line(o.subject, MAX_SUBJECT), to: line(o.to, 200), sent: o.sent === true } : {}),
    ...(isStatus(o.outcome) ? { outcome: o.outcome } : {}),
    ...(DAY.test(str(o.again)) ? { again: str(o.again) } : {}),
  };
}

const toFact = (x: unknown): Fact | null => {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const label = line(o.label, 80);
  const value = o.value == null ? "" : str(String(o.value), 1500);
  return label && value ? { label, value, ...(o.est === true ? { est: true } : {}) } : null;
};
const toPlace = (x: unknown): Place | null => {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const p: Place = {};
  for (const k of ["name", "town", "kommune", "addr", "phone", "email"] as const) {
    const v = line(o[k], 200);
    if (v) p[k] = v;
  }
  return Object.keys(p).length ? p : null;
};

/** A stored lead as it was saved (all fields checked), or null. */
export function toLead(x: unknown): Lead | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const id = str(o.id, 100);
  if (!LEAD_ID.test(id) || !isSeg(o.seg) || !line(o.name)) return null;
  return {
    id,
    seg: o.seg,
    name: line(o.name),
    sub: line(o.sub),
    place: line(o.place, 300),
    kommuner: strs(o.kommuner, 60, 20),
    prio: isPrio(o.prio) ? o.prio : "",
    prioWhy: str(o.prioWhy, 500),
    metric: line(o.metric, 80),
    sortValue: typeof o.sortValue === "number" && Number.isFinite(o.sortValue) ? o.sortValue : 0,
    facts: (Array.isArray(o.facts) ? o.facts : []).map(toFact).filter((f): f is Fact => !!f).slice(0, 40),
    places: (Array.isArray(o.places) ? o.places : []).map(toPlace).filter((p): p is Place => !!p).slice(0, 100),
    placesLabel: line(o.placesLabel, 80),
    notes: strs(o.notes, 1500, 30),
    links: strs(o.links, 500, 10).map(httpsOnly).filter(Boolean),
    source: o.source === "egen" ? "egen" : "research",
    status: isStatus(o.status) ? o.status : "ny",
    next: DAY.test(str(o.next)) ? str(o.next) : "",
    value: wholeKr(o.value),
    lostWhy: str(o.lostWhy, 1000),
    contacts: (Array.isArray(o.contacts) ? o.contacts : []).map((c) => toContact(c)).filter((c): c is CrmContact => !!c).slice(0, 60),
    dropped: strs(o.dropped, 120, 200),
    events: (Array.isArray(o.events) ? o.events : []).map(toEvent).filter((e): e is CrmEvent => !!e),
    created: str(o.created) || str(o.updated),
    updated: str(o.updated) || str(o.created),
  };
}

export function summarize(l: Lead): LeadSummary {
  const last = l.events.reduce<CrmEvent | undefined>((a, e) => (!a || e.at > a.at ? e : a), undefined);
  return {
    id: l.id,
    seg: l.seg,
    name: l.name,
    sub: l.sub,
    place: l.place,
    kommuner: l.kommuner,
    prio: l.prio,
    metric: l.metric,
    sortValue: l.sortValue,
    status: l.status,
    next: l.next,
    value: l.value,
    contacts: l.contacts.length,
    people: l.contacts.map((c) => `${c.name} ${c.title}`).join(" · ").slice(0, 600),
    lastAt: last?.at ?? "",
    lastKind: last?.kind ?? "",
  };
}

/**
 * One research lead from the research file (the lead tool's leads.json: `{ leads: [...] }`) merged into what is
 * stored: research fields are replaced, the owner's own work is kept. Contacts the owner edited (source "egen") or
 * deleted (`dropped`) are left as they are; a research contact with the same name as an own one is skipped.
 */
export function mergeResearch(stored: Lead | null, incoming: unknown, now: string): Lead | null {
  if (!incoming || typeof incoming !== "object") return null;
  const r = toLead({ ...(incoming as object), source: "research", status: "ny", next: "", value: 0, events: [], dropped: [] });
  if (!r) return null;
  const raw = (incoming as { contacts?: unknown }).contacts;
  const fresh = (Array.isArray(raw) ? raw : []).map((c) => toContact(c, "research")).filter((c): c is CrmContact => !!c);
  if (!stored) return { ...r, contacts: fresh, lostWhy: "", created: now, updated: now };
  const own = stored.contacts.filter((c) => c.source === "egen");
  const skip = new Set([...own.map((c) => key(c.name)), ...stored.dropped.map(key)]);
  // A research contact keeps its id across imports, so timeline entries still point at it.
  const oldIds = new Map(stored.contacts.filter((c) => c.source === "research").map((c) => [key(c.name), c.id]));
  const research = fresh.filter((c) => !skip.has(key(c.name))).map((c) => ({ ...c, id: oldIds.get(key(c.name)) ?? c.id }));
  return {
    ...r,
    source: stored.source,
    status: stored.status,
    next: stored.next,
    value: stored.value,
    lostWhy: stored.lostWhy,
    contacts: [...research, ...own],
    dropped: stored.dropped,
    events: stored.events,
    created: stored.created,
    updated: stored.updated,
  };
}

export type CrmError = "lead" | "status" | "contact" | "log" | "outcome" | "details" | "change";
export type ChangeResult = { ok: true; lead: Lead } | { ok: false; error: CrmError };

/** The owner's editable lead fields (segment, name, type, place, kommuner, priority, expected value), from a form. */
function details(x: unknown): Pick<Lead, "seg" | "name" | "sub" | "place" | "kommuner" | "prio" | "value"> | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const name = line(o.name, 200);
  if (!name || !isSeg(o.seg)) return null;
  const kommuner = Array.isArray(o.kommuner) ? strs(o.kommuner, 60, 20) : line(o.kommuner, 400).split(/\s*,\s*/).filter(Boolean).slice(0, 20);
  return { seg: o.seg, name, sub: line(o.sub), place: line(o.place, 300), kommuner, prio: isPrio(o.prio) ? o.prio : "", value: wholeKr(o.value) };
}

/** A new lead made on /admin (no research part). */
export function newLead(input: unknown, id: string, now: string): ChangeResult {
  const d = details(input);
  if (!d || !LEAD_ID.test(id)) return { ok: false, error: "details" };
  return {
    ok: true,
    lead: {
      ...d,
      id,
      prioWhy: "",
      metric: "",
      sortValue: 0,
      facts: [],
      places: [],
      placesLabel: "",
      notes: [],
      links: [],
      source: "egen",
      status: "ny",
      next: "",
      lostWhy: "",
      contacts: [],
      dropped: [],
      events: [],
      created: now,
      updated: now,
    },
  };
}

/**
 * The status, follow-up date and lost reason an outcome gives a lead. "senere" needs months (AGAIN_MONTHS) and sets
 * the follow-up that many months from today; "vundet" and "tabt" clear the follow-up; the pipeline steps keep it.
 * Null when the outcome or its months are not valid; `{}` for "Ingen ændring".
 */
export function outcomeOf(
  outcome: unknown,
  months: unknown,
  today: string,
  text: string,
): { status?: LeadStatus; next?: string; lostWhy?: string; again?: string } | null {
  if (outcome === "" || outcome == null) return {};
  if (!OUTCOMES.some((o) => o.id === outcome)) return null;
  const s = outcome as LeadStatus;
  if (s === "senere") {
    const m = Number(months);
    if (!AGAIN_MONTHS.includes(m as (typeof AGAIN_MONTHS)[number])) return null;
    const again = addMonthsDay(today, m);
    return { status: s, next: again, again };
  }
  if (s === "vundet") return { status: s, next: "" };
  if (s === "tabt") return { status: s, next: "", lostWhy: text.slice(0, 1000) };
  return { status: s };
}

/** Applies one change from /admin to a lead. Mails are sent by lib/crm-store.ts (`mailLead`), not here. */
export function applyCrmChange(lead: Lead, change: unknown, now: string, rnd?: () => number): ChangeResult {
  const c = (change && typeof change === "object" ? change : {}) as Record<string, unknown>;
  const done = (l: Lead): ChangeResult => ({ ok: true, lead: { ...l, updated: now } });
  switch (c.type) {
    case "status": {
      const next = str(c.next);
      if (!isStatus(c.status) || (next && !DAY.test(next))) return { ok: false, error: "status" };
      return done({ ...lead, status: c.status, next, lostWhy: c.status === "tabt" ? lead.lostWhy : "" });
    }
    case "contact": {
      const o = (c.contact && typeof c.contact === "object" ? c.contact : {}) as Record<string, unknown>;
      const email = line(o.email, 200);
      if (email && !EMAIL.test(email)) return { ok: false, error: "contact" };
      const made = toContact({ ...o, role: undefined, src: undefined, source_url: undefined }, "egen");
      if (!made) return { ok: false, error: "contact" };
      const at = lead.contacts.findIndex((x) => x.id === o.id);
      if (at >= 0) {
        // An edited research contact becomes the owner's own; its source link stays.
        const was = lead.contacts[at]!;
        const contacts = [...lead.contacts];
        contacts[at] = { ...made, id: was.id, ...(was.src ? { src: was.src } : {}) };
        return done({ ...lead, contacts });
      }
      if (lead.contacts.length >= 60) return { ok: false, error: "contact" };
      return done({ ...lead, contacts: [...lead.contacts, { ...made, id: newItemId(rnd) }] });
    }
    case "contactDelete": {
      const gone = lead.contacts.find((x) => x.id === c.contactId);
      if (!gone) return { ok: false, error: "contact" };
      return done({
        ...lead,
        contacts: lead.contacts.filter((x) => x !== gone),
        dropped: gone.source === "research" ? [...lead.dropped, gone.name] : lead.dropped,
      });
    }
    case "log": {
      const text = str(c.text, MAX_TEXT + 1);
      // Mails are only logged by mailLead, which sends them.
      if (!isKind(c.kind) || c.kind === "mail" || !text || text.length > MAX_TEXT) return { ok: false, error: "log" };
      const out = outcomeOf(c.outcome, c.months, now.slice(0, 10), text);
      if (!out) return { ok: false, error: "outcome" };
      const contact = lead.contacts.some((x) => x.id === c.contact) ? String(c.contact) : undefined;
      // A call or meeting may be logged for an earlier day (the date field); it is kept at noon that day.
      const at = DAY.test(str(c.at)) && str(c.at) < now.slice(0, 10) ? `${str(c.at)}T12:00:00.000Z` : now;
      const ev: CrmEvent = {
        id: newItemId(rnd),
        at,
        kind: c.kind,
        text,
        ...(contact ? { contact } : {}),
        ...(out.status ? { outcome: out.status } : {}),
        ...(out.again ? { again: out.again } : {}),
      };
      // Without an outcome, a first call or meeting moves a lead that was never contacted on to "Kontaktet".
      const status = out.status ?? (lead.status === "ny" && c.kind !== "note" ? "kontaktet" : lead.status);
      return done({
        ...lead,
        events: [...lead.events, ev],
        status,
        next: out.next ?? lead.next,
        lostWhy: out.lostWhy ?? (out.status ? "" : lead.lostWhy),
      });
    }
    case "eventDelete": {
      const ev = lead.events.find((x) => x.id === c.eventId);
      // A sent mail stays in the timeline: it is the record of what went out.
      if (!ev || (ev.kind === "mail" && ev.sent)) return { ok: false, error: "log" };
      return done({ ...lead, events: lead.events.filter((x) => x !== ev) });
    }
    case "details": {
      const d = details(c.lead);
      if (!d) return { ok: false, error: "details" };
      return done({ ...lead, ...d });
    }
    default:
      return { ok: false, error: "change" };
  }
}

export type MailCheck =
  | { ok: true; to: string; subject: string; text: string; contact: CrmContact; outcome: ReturnType<typeof outcomeOf> & object }
  | { ok: false; error: "contact" | "mail" | "consent" | "mailLimit" | "outcome" };

/** Checks a mail to one of a lead's contacts before it is sent: a valid address, subject and text, the owner's
 * confirmation that the person has agreed to mail (markedsføringsloven § 10), the outcome, and the per-lead limit. */
export function checkMail(
  lead: Lead,
  input: { contactId?: unknown; subject?: unknown; text?: unknown; consent?: unknown; outcome?: unknown; months?: unknown },
  now: Date,
): MailCheck {
  const contact = lead.contacts.find((x) => x.id === input.contactId);
  if (!contact || !EMAIL.test(contact.email)) return { ok: false, error: "contact" };
  const subject = line(input.subject, MAX_SUBJECT + 1);
  const text = str(input.text, MAX_TEXT + 1);
  if (!subject || subject.length > MAX_SUBJECT || !text || text.length > MAX_TEXT) return { ok: false, error: "mail" };
  if (input.consent !== true) return { ok: false, error: "consent" };
  const outcome = outcomeOf(input.outcome, input.months, now.toISOString().slice(0, 10), text);
  if (!outcome) return { ok: false, error: "outcome" };
  const dayAgo = now.getTime() - 24 * 3600_000;
  if (lead.events.filter((e) => e.kind === "mail" && Date.parse(e.at) > dayAgo).length >= MAX_MAILS_PER_LEAD_DAY)
    return { ok: false, error: "mailLimit" };
  return { ok: true, to: contact.email, subject, text, contact, outcome };
}

/** Adds a mail to the timeline (sent or not) with its outcome; without one, a sent first mail moves the lead on to
 * "Kontaktet". An outcome only applies when the mail went out. */
export function logMail(lead: Lead, m: Extract<MailCheck, { ok: true }>, sent: boolean, now: string, rnd?: () => number): Lead {
  const out = sent ? m.outcome : {};
  const ev: CrmEvent = {
    id: newItemId(rnd),
    at: now,
    kind: "mail",
    text: m.text,
    contact: m.contact.id,
    subject: m.subject,
    to: m.to,
    sent,
    ...(out.status ? { outcome: out.status } : {}),
    ...(out.again ? { again: out.again } : {}),
  };
  return {
    ...lead,
    events: [...lead.events, ev],
    status: out.status ?? (lead.status === "ny" && sent ? "kontaktet" : lead.status),
    next: out.next ?? lead.next,
    lostWhy: out.lostWhy ?? (out.status ? "" : lead.lostWhy),
    updated: now,
  };
}

/** Lists in the order the owner works through them: follow-ups due first (oldest first), then priority, then size. */
export function sortLeads(rows: LeadSummary[], today: string): LeadSummary[] {
  const due = (r: LeadSummary) => (r.next && r.next <= today ? 0 : 1);
  return [...rows].sort(
    (a, b) =>
      due(a) - due(b) ||
      (due(a) === 0 ? a.next.localeCompare(b.next) : 0) ||
      (a.prio || "Z").localeCompare(b.prio || "Z") ||
      b.sortValue - a.sortValue ||
      a.name.localeCompare(b.name, "da"),
  );
}
