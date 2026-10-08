/**
 * Owner overview (/admin): users, active users, paying users, revenue, expenses and customer categories.
 *
 * There is no payment provider yet, so the owner keeps the money side by hand in a ledger
 * ({ orgs, expenses, accounts: { <accountId>: { org?, plan? } } }; stored by lib/owner-store.ts).
 *
 * A private customer is an account with its own plan; banks, estate agents and schools are organisations
 * (firmaaftaler) with one plan, and accounts can be linked to one. A plan's start is the first charge; it renews
 * every month or year on the same day until its end (the first day without access – nothing is charged from that
 * day on). Accounts without a plan are on the free trial for TRIAL_DAYS after signing up.
 *
 * No server imports: the owner page's browser code uses the categories, prices and types from here.
 */
import type { Account } from "./accounts";

export const TRIAL_DAYS = 30;
export const ACTIVE_DAYS = 30;

export type Category = "bank" | "maegler" | "skole" | "privat";
export type OrgCategory = Exclude<Category, "privat">;
export const CATEGORIES: readonly { id: Category; label: string }[] = [
  { id: "bank", label: "Banker" },
  { id: "maegler", label: "Ejendomsmæglere" },
  { id: "skole", label: "Skoler" },
  { id: "privat", label: "Privatpersoner" },
];
const isOrgCategory = (v: unknown): v is OrgCategory => v === "bank" || v === "maegler" || v === "skole";

export type Interval = "monthly" | "yearly";
export interface Plan {
  interval: Interval;
  /** Kroner per interval. */
  price: number;
  /** YYYY-MM-DD, the first charge. */
  start: string;
  /** YYYY-MM-DD, the first day without access (cancelled). */
  end?: string;
}

export interface Org {
  id: string;
  name: string;
  category: OrgCategory;
  plan?: Plan;
  /** Licences in the agreement (information only). */
  seats?: number;
  note?: string;
}

export interface Expense {
  id: string;
  name: string;
  /** Kroner per interval, or once. */
  amount: number;
  interval: Interval | "once";
  /** YYYY-MM-DD, the first (or only) payment. */
  start: string;
  end?: string;
}

export interface Ledger {
  orgs: Org[];
  expenses: Expense[];
  accounts: Record<string, { org?: string; plan?: Plan }>;
}

/** Price list from the landing page (components/landing/PricePlans.tsx): base price + each extra login. */
export const PRICES: Record<Interval, { base: number; extra: number }> = {
  monthly: { base: 29, extra: 9 },
  yearly: { base: 296, extra: 92 },
};
export const listPrice = (interval: Interval, logins: number) =>
  PRICES[interval].base + PRICES[interval].extra * Math.max(0, logins - 1);

// ---- Dates (YYYY-MM-DD strings compare in date order) ------------------------------------------------------------

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (v: unknown): v is string => typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(v));
/** Today in Denmark as YYYY-MM-DD. */
export const today = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" });
const daysIn = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const ymd = (y: number, m0: number, d: number) =>
  `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const split = (s: string) => s.split("-").map(Number) as [number, number, number];
export const addDays = (date: string, n: number) => {
  const [y, m, d] = split(date);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
/** The month `n` months after the one `date` is in, as [year, month 0-11]. */
export const monthAfter = (date: string, n: number): [number, number] => {
  const [y, m] = split(date);
  const i = y * 12 + m - 1 + n;
  return [Math.floor(i / 12), i % 12];
};
const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
export const monthName = (y: number, m0: number) => `${MONTHS[m0]} ${y}`;

type Recurring = { interval: Interval | "once"; start: string; end?: string };

/** The day in month (y, m0) that this plan or expense is paid, or null when nothing is paid that month. */
export function chargeIn(p: Recurring, y: number, m0: number): string | null {
  const [sy, sm, sd] = split(p.start);
  if (p.interval === "once") return sy === y && sm - 1 === m0 ? p.start : null;
  if (p.interval === "yearly" && sm - 1 !== m0) return null;
  const day = ymd(y, m0, Math.min(sd, daysIn(y, m0)));
  if (day < p.start || (p.end && day >= p.end)) return null;
  return day;
}

export const activeOn = (p: Recurring, date: string) => p.start <= date && (!p.end || date < p.end);
/** What the plan brings in per month while it runs (MRR). */
export const monthly = (p: Plan) => (p.interval === "monthly" ? p.price : p.price / 12);

// ---- The overview ------------------------------------------------------------------------------------------------

export type Status = "paying" | "trial" | "ended" | "free" | "unconfirmed";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  logins: number;
  category: Category;
  org?: { id: string; name: string };
  /** Own plan (private customers). */
  plan?: Plan;
  status: Status;
  trialEnds?: string;
  lastSeen?: string;
}

export interface OrgRow extends Org {
  accounts: number;
  logins: number;
  status: Status;
}

export interface Line {
  who: string;
  category: Category;
  date: string;
  amount: number;
}

export interface CategoryRow {
  id: Category;
  label: string;
  customers: number;
  payingCustomers: number;
  logins: number;
  active: number;
  paying: number;
  mrr: number;
  nextMonth: number;
}

export interface Overview {
  today: string;
  nextMonth: string;
  users: { logins: number; budgets: number; unconfirmed: number };
  active: { d30: number; d7: number };
  paying: { logins: number; customers: number; trial: number };
  mrr: number;
  next: {
    revenue: number;
    expenses: number;
    renewals: Line[];
    /** Plans that end next month: what they brought in per month. */
    ending: Line[];
    /** Free trials that end next month (could become paying). */
    trialsEnding: Line[];
    expenseLines: Line[];
  };
  months: { label: string; revenue: number; expenses: number }[];
  categories: CategoryRow[];
  customers: CustomerRow[];
  orgs: OrgRow[];
  expenses: Expense[];
}

/** Holder id → last time seen (ISO), per budget id. */
export type Activity = Record<string, Record<string, string>>;

const planStatus = (p: Plan | undefined, date: string): Status | null =>
  !p ? null : activeOn(p, date) ? "paying" : p.end && p.end <= date ? "ended" : null;

const round = (n: number) => Math.round(n * 100) / 100;

/** Everything on the owner page, from the accounts, the ledger and the activity (no I/O, so it can be tested). */
export function buildOverview(accounts: Account[], ledger: Ledger, activity: Activity, now = new Date()): Overview {
  const day = today(now);
  const [ny, nm] = monthAfter(day, 1);
  const orgById = new Map(ledger.orgs.map((o) => [o.id, o]));
  const since = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

  const customers: CustomerRow[] = accounts.map((a) => {
    const entry = ledger.accounts[a.id] ?? {};
    const org = entry.org ? orgById.get(entry.org) : undefined;
    const seen = Object.values(activity[a.id] ?? {}).sort().at(-1);
    const logins = 1 + (a.members ?? []).filter((m) => m.verifiedAt).length;
    const trialEnds = addDays(today(new Date(a.createdAt)), TRIAL_DAYS);
    const plan = org ? org.plan : entry.plan;
    const status: Status = !a.verifiedAt
      ? "unconfirmed"
      : planStatus(plan, day) ?? (!org && trialEnds > day ? "trial" : "free");
    return {
      id: a.id,
      name: `${a.firstName} ${a.lastName}`,
      email: a.email,
      createdAt: a.createdAt,
      logins,
      category: org ? org.category : "privat",
      org: org && { id: org.id, name: org.name },
      plan: entry.plan,
      status,
      trialEnds: org ? undefined : trialEnds,
      lastSeen: seen,
    };
  });
  customers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const confirmed = customers.filter((c) => c.status !== "unconfirmed");

  // Who sees each holder: active users count the primary and each member separately.
  const activeLogins = (c: CustomerRow, days: number) =>
    Object.values(activity[c.id] ?? {}).filter((t) => t >= since(days)).length;

  const orgs: OrgRow[] = ledger.orgs.map((o) => {
    const linked = confirmed.filter((c) => c.org?.id === o.id);
    return {
      ...o,
      accounts: linked.length,
      logins: linked.reduce((s, c) => s + c.logins, 0),
      status: planStatus(o.plan, day) ?? "free",
    };
  });

  // Who pays: private accounts with their own plan, and organisations.
  const payers: { who: string; category: Category; plan: Plan }[] = [
    ...confirmed.filter((c) => !c.org && c.plan).map((c) => ({ who: c.name, category: "privat" as const, plan: c.plan! })),
    ...ledger.orgs.filter((o) => o.plan).map((o) => ({ who: o.name, category: o.category as Category, plan: o.plan! })),
  ];
  const revenueIn = (y: number, m0: number) =>
    payers.flatMap((p) => {
      const date = chargeIn(p.plan, y, m0);
      return date ? [{ who: p.who, category: p.category, date, amount: p.plan.price }] : [];
    });
  const expensesIn = (y: number, m0: number) =>
    ledger.expenses.flatMap((e) => {
      const date = chargeIn(e, y, m0);
      return date ? [{ who: e.name, category: "privat" as const, date, amount: e.amount }] : [];
    });
  const sum = (lines: Line[]) => round(lines.reduce((s, l) => s + l.amount, 0));
  const inMonth = (date: string | undefined, y: number, m0: number) => !!date && date.startsWith(ymd(y, m0, 1).slice(0, 8));
  const byDate = (a: Line, b: Line) => a.date.localeCompare(b.date) || a.who.localeCompare(b.who, "da");

  const renewals = revenueIn(ny, nm).sort(byDate);
  const expenseLines = expensesIn(ny, nm).sort(byDate);
  const ending = payers
    .filter((p) => inMonth(p.plan.end, ny, nm))
    .map((p) => ({ who: p.who, category: p.category, date: p.plan.end!, amount: round(monthly(p.plan)) }))
    .sort(byDate);
  const trialsEnding = confirmed
    .filter((c) => c.status === "trial" && inMonth(c.trialEnds, ny, nm))
    .map((c) => ({ who: c.name, category: c.category, date: c.trialEnds!, amount: listPrice("monthly", c.logins) }))
    .sort(byDate);

  const months = Array.from({ length: 12 }, (_, i) => {
    const [y, m0] = monthAfter(day, i + 1);
    return { label: monthName(y, m0), revenue: sum(revenueIn(y, m0)), expenses: sum(expensesIn(y, m0)) };
  });

  const payingNow = (c: CustomerRow) => c.status === "paying";
  const categories: CategoryRow[] = CATEGORIES.map(({ id, label }) => {
    const cs = confirmed.filter((c) => c.category === id);
    const os = orgs.filter((o) => o.category === id);
    const ps = payers.filter((p) => p.category === id);
    return {
      id,
      label,
      customers: id === "privat" ? cs.length : os.length,
      payingCustomers: id === "privat" ? cs.filter(payingNow).length : os.filter((o) => o.status === "paying").length,
      logins: cs.reduce((s, c) => s + c.logins, 0),
      active: cs.reduce((s, c) => s + activeLogins(c, ACTIVE_DAYS), 0),
      paying: cs.filter(payingNow).reduce((s, c) => s + c.logins, 0),
      mrr: round(ps.filter((p) => activeOn(p.plan, day)).reduce((s, p) => s + monthly(p.plan), 0)),
      nextMonth: sum(renewals.filter((l) => l.category === id)),
    };
  });

  return {
    today: day,
    nextMonth: monthName(ny, nm),
    users: {
      logins: confirmed.reduce((s, c) => s + c.logins, 0),
      budgets: confirmed.length,
      unconfirmed: customers.length - confirmed.length,
    },
    active: {
      d30: confirmed.reduce((s, c) => s + activeLogins(c, 30), 0),
      d7: confirmed.reduce((s, c) => s + activeLogins(c, 7), 0),
    },
    paying: {
      logins: categories.reduce((s, c) => s + c.paying, 0),
      customers: categories.reduce((s, c) => s + c.payingCustomers, 0),
      trial: confirmed.filter((c) => c.status === "trial").length,
    },
    mrr: round(categories.reduce((s, c) => s + c.mrr, 0)),
    next: { revenue: sum(renewals), expenses: sum(expenseLines), renewals, ending, trialsEnding, expenseLines },
    months,
    categories,
    customers,
    orgs,
    expenses: [...ledger.expenses].sort((a, b) => a.name.localeCompare(b.name, "da")),
  };
}

export const emptyLedger = (): Ledger => ({ orgs: [], expenses: [], accounts: {} });

// ---- Changes from the owner page ---------------------------------------------------------------------------------

export type Change =
  | { type: "account"; id: string; org?: string | null; plan?: unknown }
  | { type: "org"; org: unknown }
  | { type: "deleteOrg"; id: string }
  | { type: "expense"; expense: unknown }
  | { type: "deleteExpense"; id: string };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const amount = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(/\s/g, "").replace(",", ".")) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100_000_000 ? round(n) : null;
};
const newId = (prefix: string) => prefix + crypto.randomUUID().replace(/-/g, "").slice(0, 12);

export function parsePlan(v: unknown): Plan | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const price = amount(o.price);
  if ((o.interval !== "monthly" && o.interval !== "yearly") || price === null || !isDate(o.start)) return null;
  if (o.end !== undefined && o.end !== "" && (!isDate(o.end) || o.end <= o.start)) return null;
  return { interval: o.interval, price, start: o.start, ...(isDate(o.end) ? { end: o.end } : {}) };
}

/** Applies one change from the owner page; returns the new ledger, or an error key for the form. */
export function applyChange(ledger: Ledger, change: unknown, accountIds: string[]): { ok: true; ledger: Ledger } | { ok: false; error: string } {
  const c = (change ?? {}) as Record<string, unknown>;
  const next: Ledger = structuredClone(ledger);
  switch (c.type) {
    case "account": {
      if (typeof c.id !== "string" || !accountIds.includes(c.id)) return { ok: false, error: "account" };
      const entry = { ...next.accounts[c.id] };
      if (c.org !== undefined) {
        if (c.org === null || c.org === "") delete entry.org;
        else if (typeof c.org === "string" && next.orgs.some((o) => o.id === c.org)) entry.org = c.org;
        else return { ok: false, error: "org" };
      }
      if (c.plan !== undefined) {
        if (c.plan === null) delete entry.plan;
        else {
          const p = parsePlan(c.plan);
          if (!p) return { ok: false, error: "plan" };
          entry.plan = p;
        }
      }
      if (entry.org || entry.plan) next.accounts[c.id] = entry;
      else delete next.accounts[c.id];
      return { ok: true, ledger: next };
    }
    case "org": {
      const o = (c.org ?? {}) as Record<string, unknown>;
      const name = text(o.name, 120);
      if (!name) return { ok: false, error: "name" };
      if (!isOrgCategory(o.category)) return { ok: false, error: "category" };
      const plan = o.plan === null || o.plan === undefined ? undefined : parsePlan(o.plan);
      if (plan === null) return { ok: false, error: "plan" };
      const seats = o.seats === undefined || o.seats === "" || o.seats === null ? undefined : amount(o.seats);
      if (seats === null || (seats !== undefined && !Number.isInteger(seats))) return { ok: false, error: "seats" };
      const id = typeof o.id === "string" && o.id ? o.id : newId("o-");
      if (o.id && !next.orgs.some((x) => x.id === id)) return { ok: false, error: "org" };
      const org: Org = { id, name, category: o.category, ...(plan ? { plan } : {}), ...(seats !== undefined ? { seats } : {}) };
      const note = text(o.note, 500);
      if (note) org.note = note;
      next.orgs = next.orgs.some((x) => x.id === id) ? next.orgs.map((x) => (x.id === id ? org : x)) : [...next.orgs, org];
      return { ok: true, ledger: next };
    }
    case "deleteOrg": {
      if (!next.orgs.some((o) => o.id === c.id)) return { ok: false, error: "org" };
      next.orgs = next.orgs.filter((o) => o.id !== c.id);
      for (const [id, e] of Object.entries(next.accounts)) {
        if (e.org !== c.id) continue;
        delete e.org;
        if (!e.plan) delete next.accounts[id];
      }
      return { ok: true, ledger: next };
    }
    case "expense": {
      const e = (c.expense ?? {}) as Record<string, unknown>;
      const name = text(e.name, 120);
      if (!name) return { ok: false, error: "name" };
      const sum = amount(e.amount);
      if (sum === null) return { ok: false, error: "amount" };
      if (e.interval !== "monthly" && e.interval !== "yearly" && e.interval !== "once") return { ok: false, error: "interval" };
      if (!isDate(e.start)) return { ok: false, error: "start" };
      const end = e.interval === "once" || e.end === undefined || e.end === "" ? undefined : e.end;
      if (end !== undefined && (!isDate(end) || end <= e.start)) return { ok: false, error: "end" };
      const id = typeof e.id === "string" && e.id ? e.id : newId("x-");
      if (e.id && !next.expenses.some((x) => x.id === id)) return { ok: false, error: "expense" };
      const ex: Expense = { id, name, amount: sum, interval: e.interval, start: e.start, ...(end ? { end } : {}) };
      next.expenses = next.expenses.some((x) => x.id === id) ? next.expenses.map((x) => (x.id === id ? ex : x)) : [...next.expenses, ex];
      return { ok: true, ledger: next };
    }
    case "deleteExpense": {
      if (!next.expenses.some((x) => x.id === c.id)) return { ok: false, error: "expense" };
      next.expenses = next.expenses.filter((x) => x.id !== c.id);
      return { ok: true, ledger: next };
    }
    default:
      return { ok: false, error: "type" };
  }
}

