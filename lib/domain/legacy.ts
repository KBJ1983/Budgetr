import { DEFAULT_BANK_RULE, GOAL_COLORS } from "./example";
import type { Account, Budget, BudgetItem, Interval, Scenario, ScenarioChange } from "./types";
import { INTERVALS } from "./types";

/**
 * Converts the state of the first budgetr prototype (the single-file "Budget2027.html" app) to the
 * current Budget model. Pure; the caller decides where the result is stored.
 */

export interface LegacyEntry {
  id: string;
  type: "indtaegt" | "udgift" | "overfoersel";
  desc: string;
  amount: number;
  freq: number;
  account?: string;
  payer?: string;
  category?: string;
  key?: string;
  note?: string;
  active?: boolean;
  bank?: boolean;
  from?: string;
  to?: string;
}

export interface LegacyState {
  accounts: { id: string; name: string; number?: string; owner?: string; type?: string }[];
  entries: LegacyEntry[];
  goals?: {
    id: string;
    name: string;
    mode?: string;
    target?: number;
    monthly?: number;
    saved?: number;
    end?: string;
    from?: string;
    payer?: string;
    active?: boolean;
    extras?: { amount: number; date: string; desc?: string }[];
  }[];
  loans?: {
    id: string;
    bank?: string;
    desc?: string;
    ends?: string;
    link?: string;
    monthly?: number;
    original?: number;
    rate?: number | string;
    rest?: number;
    paused?: boolean;
    note?: string;
  }[];
  persons: { id: string; name: string; extras?: { amount: number; desc: string }[] }[];
  scenarios?: {
    id: string;
    name: string;
    added?: LegacyEntry[];
    overrides?: Record<string, { amount?: number; desc?: string; account?: string; bank?: boolean; active?: boolean; removed?: boolean }>;
  }[];
  settings?: {
    split?: string;
    manualPct?: number;
    bank?: { adults?: number; children?: number; childRate?: number; withExtra?: boolean };
  };
}

const BANK_OUT = ["husholdning", "opsparing"];
const owner = (payer: string | undefined) => (!payer || payer === "faelles" ? null : payer);
const genitive = (s: string) => (/[sxz]$/i.test(s) ? `${s}’` : `${s}s`);

export function fromLegacy(s: LegacyState, opts: { id: string; now?: Date }): Budget {
  const iso = (opts.now ?? new Date()).toISOString();
  const personIds = new Set(s.persons.map((p) => p.id));

  const accounts: Account[] = s.accounts.map((a) => {
    const ownerId = a.owner && personIds.has(a.owner) ? a.owner : null;
    const kind: Account["kind"] = /opsparing/i.test(a.name)
      ? "opsparing"
      : ownerId
        ? "løn"
        : a.type === "faelles"
          ? "budget"
          : "anden";
    return { id: a.id, name: a.name, ownerId, kind, ...(a.number ? { number: a.number } : {}) };
  });
  const defaultAccount = accounts.find((a) => a.kind === "budget")?.id ?? accounts[0]?.id ?? "";

  const toItem = (e: LegacyEntry): BudgetItem => {
    const freq = Number(e.freq) || 1;
    const ok = (INTERVALS as number[]).includes(freq);
    const category = e.category?.trim() || "Andet";
    const bankExcluded =
      e.type === "udgift"
        ? e.bank !== undefined
          ? !e.bank
          : BANK_OUT.includes(category.toLowerCase()) || /gave/i.test(e.desc)
        : undefined;
    return {
      id: e.id,
      name: e.desc,
      kind: e.type === "indtaegt" ? "indtægt" : "udgift",
      amount: ok ? e.amount : Math.round(e.amount / freq),
      interval: (ok ? freq : 1) as Interval,
      ownerId: owner(e.payer),
      accountId: e.account && accounts.some((a) => a.id === e.account) ? e.account : defaultAccount,
      category,
      ...(bankExcluded ? { bankExcluded } : {}),
      ...(e.key ? { agreementNo: e.key } : {}),
      ...(e.active === false ? { active: false } : {}),
      ...(e.note ? { note: e.note } : {}),
      history: [],
    };
  };

  const registeredTransfers: Record<string, number> = {};
  const items: BudgetItem[] = [];
  for (const e of s.entries) {
    if (e.type === "overfoersel") {
      if (e.active !== false && e.from && e.to) registeredTransfers[`${e.from}>${e.to}`] = e.amount;
    } else items.push(toItem(e));
  }

  // Extra earnings per person (side jobs etc.): kept as extra income lines.
  for (const p of s.persons) {
    const acc = accounts.find((a) => a.kind === "løn" && a.ownerId === p.id)?.id ?? defaultAccount;
    (p.extras ?? [])
      .filter((x) => x.amount > 0)
      .forEach((x, i) =>
        items.push({
          id: `extra-${p.id}-${i}`,
          name: `${x.desc || "Ekstra"} ${p.name}`,
          kind: "indtægt",
          amount: x.amount,
          interval: 1,
          ownerId: p.id,
          accountId: acc,
          category: "Ekstra indtjening",
          extra: true,
          history: [],
        }),
      );
  }

  const loans = (s.loans ?? [])
    .filter((l) => l.link && items.some((i) => i.id === l.link))
    .map((l) => {
      const item = items.find((i) => i.id === l.link)!;
      item.loanId = l.id;
      const rate = Number(l.rate);
      const budgetMonthly = item.amount / item.interval;
      const notes = [l.note, l.rate === "" || l.rate === undefined ? "Rente ikke angivet" : ""].filter(Boolean);
      return {
        id: l.id,
        name: l.desc || l.bank || "Lån",
        balance: l.rest ?? 0,
        ratePct: Number.isFinite(rate) ? rate : 0,
        principal: Math.max(l.original ?? 0, l.rest ?? 0),
        itemId: item.id,
        ...(l.bank ? { bank: l.bank } : {}),
        ...(l.monthly && Math.abs(l.monthly - budgetMonthly) > 1 ? { payment: l.monthly } : {}),
        ...(l.ends ? { bankEnd: l.ends } : {}),
        ...(l.paused ? { paused: true } : {}),
        ...(notes.length ? { note: notes.join(". ") } : {}),
      };
    });

  const goals = (s.goals ?? [])
    .filter((g) => g.active !== false)
    .map((g, i) => ({
      id: g.id,
      name: g.name,
      color: GOAL_COLORS[i % GOAL_COLORS.length]!,
      mode: g.mode === "monthly" ? ("monthly" as const) : ("target" as const),
      target: g.target ?? 0,
      deadline: (g.end ?? iso).slice(0, 7),
      monthly: g.monthly ?? 0,
      saved: g.saved ?? 0,
      extras: (g.extras ?? []).map((x, j) => ({
        id: `${g.id}-x${j}`,
        month: x.date.slice(0, 7),
        amount: x.amount,
        note: x.desc ?? "",
      })),
      ownerId: owner(g.payer),
      accountId: g.from && accounts.some((a) => a.id === g.from) ? g.from : defaultAccount,
    }));

  const scenarios: Scenario[] = (s.scenarios ?? []).map((sc) => {
    const changes: ScenarioChange[] = [];
    for (const [itemId, o] of Object.entries(sc.overrides ?? {})) {
      if (!items.some((i) => i.id === itemId)) continue;
      if (o.removed) {
        changes.push({ kind: "removeItem", itemId });
        continue;
      }
      const patch: Extract<ScenarioChange, { kind: "editItem" }>["patch"] = {};
      if (o.amount !== undefined) patch.amount = o.amount;
      if (o.desc) patch.name = o.desc;
      if (o.account) patch.accountId = o.account;
      if (o.bank !== undefined) patch.bankExcluded = !o.bank;
      if (o.active !== undefined) patch.active = o.active;
      if (Object.keys(patch).length) changes.push({ kind: "editItem", itemId, patch });
    }
    for (const e of sc.added ?? []) changes.push({ kind: "addItem", item: toItem(e) });
    return { id: sc.id, name: sc.name, changes };
  });

  const bank = s.settings?.bank ?? {};
  const adults = Math.max(1, s.persons.length);
  const split = s.settings?.split;
  const fixedPct: Record<string, number> = {};
  if (split === "manuel" || split === "fast") {
    const pct = s.settings?.manualPct ?? 50;
    s.persons.forEach((p, i) => (fixedPct[p.id] = i === 0 ? pct : (100 - pct) / Math.max(1, s.persons.length - 1)));
  }

  return {
    id: opts.id,
    name: `${genitive(s.persons.map((p) => p.name).join(" og ") || "Mit")} budget`,
    persons: s.persons.map((p) => ({ id: p.id, name: p.name })),
    children: bank.children ?? 0,
    accounts,
    items,
    loans,
    goals,
    split: {
      mode: split === "lige" || split === "ligeligt" ? "equal" : Object.keys(fixedPct).length ? "fixed" : "income",
      fixedPct,
    },
    registeredTransfers,
    scenarios,
    bankRule: {
      perAdult: bank.adults !== undefined ? Math.round(bank.adults / adults) : DEFAULT_BANK_RULE.perAdult,
      perChild: bank.childRate ?? DEFAULT_BANK_RULE.perChild,
      withExtra: bank.withExtra ?? false,
    },
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Pulls the embedded `<script type="application/json" id="seed">` state out of the prototype HTML. */
export function extractLegacySeed(html: string): LegacyState {
  const start = html.indexOf('<script type="application/json" id="seed">');
  if (start < 0) throw new Error("No seed script found");
  const body = html.slice(start + '<script type="application/json" id="seed">'.length);
  // Inside the bundled app source "</script>" is escaped as "@@ENDSCRIPT@@>".
  const ends = [body.indexOf("</script>"), body.indexOf("@@ENDSCRIPT@@")].filter((i) => i >= 0);
  return JSON.parse(body.slice(0, Math.min(...ends))) as LegacyState;
}
