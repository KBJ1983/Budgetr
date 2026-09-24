import { allItems, monthly, shares } from "./calc";
import type { Budget, Id, Month } from "./types";

export interface Transfer {
  key: string;
  from: Id;
  to: Id;
  /** What the budget needs, rounded up to whole hundreds. */
  amount: number;
  /** What is set up in the net bank today, if recorded. */
  registered: number | undefined;
  needsUpdate: boolean;
}

export const transferKey = (from: Id, to: Id) => `${from}>${to}`;

const roundUp100 = (n: number) => Math.ceil(n / 100) * 100;

/**
 * Standing transfers that follow the split: every non-salary account is topped up from the
 * salary accounts of the people who pay for what is drawn from it.
 */
export function computeTransfers(budget: Budget, now: Month): Transfer[] {
  const items = allItems(budget, now);
  const sh = shares(budget);
  const salaryOf = (personId: Id) =>
    budget.accounts.find((a) => a.kind === "løn" && a.ownerId === personId)?.id;
  const out: Transfer[] = [];

  for (const acc of budget.accounts) {
    if (acc.kind === "løn") continue;
    const onAcc = items.filter((i) => i.accountId === acc.id);
    const perPerson = new Map<Id, number>();
    for (const i of onAcc) {
      const sign = i.kind === "indtægt" ? -1 : 1;
      const m = monthly(i) * sign;
      if (i.ownerId) perPerson.set(i.ownerId, (perPerson.get(i.ownerId) ?? 0) + m);
      else for (const p of budget.persons) perPerson.set(p.id, (perPerson.get(p.id) ?? 0) + m * (sh[p.id] ?? 0));
    }
    for (const [personId, need] of perPerson) {
      const from = salaryOf(personId);
      if (!from || need <= 0) continue;
      const key = transferKey(from, acc.id);
      const amount = roundUp100(need);
      const registered = budget.registeredTransfers[key];
      out.push({ key, from, to: acc.id, amount, registered, needsUpdate: registered !== undefined && registered !== amount });
    }
  }
  return out;
}

/** Recorded transfers that the budget no longer needs (should be stopped in the net bank). */
export function obsoleteTransfers(budget: Budget, computed: Transfer[]): { key: string; from: Id; to: Id; amount: number }[] {
  const live = new Set(computed.map((t) => t.key));
  return Object.entries(budget.registeredTransfers)
    .filter(([k, v]) => !live.has(k) && v > 0)
    .map(([k, amount]) => {
      const [from = "", to = ""] = k.split(">");
      return { key: k, from, to, amount };
    });
}
