import { monthsBetween } from "./format";
import { loanSummary } from "./loans";
import type { Budget, BudgetItem, Id, Month, SavingsGoal } from "./types";

export const monthly = (item: Pick<BudgetItem, "amount" | "interval">): number => item.amount / item.interval;

/** Monthly deposit needed for a goal. Target goals spread the rest over the months left. */
export function goalMonthly(goal: SavingsGoal, now: Month): number {
  if (goal.mode === "monthly") return goal.monthly;
  const left = Math.max(1, monthsBetween(now, goal.deadline));
  const extras = goal.extras
    .filter((e) => monthsBetween(now, e.month) >= 0 && monthsBetween(e.month, goal.deadline) >= 0)
    .reduce((a, e) => a + e.amount, 0);
  const rest = goal.target - goal.saved - extras;
  return rest <= 0 ? 0 : Math.ceil(rest / left);
}

export function goalProgress(goal: SavingsGoal): number {
  if (goal.mode === "monthly" || goal.target <= 0) return 0;
  return Math.min(1, goal.saved / goal.target);
}

/** Savings goals as budget lines, so every calculation sees one flat list. */
export function goalItems(budget: Budget, now: Month): BudgetItem[] {
  return budget.goals.map((g) => ({
    id: `goal:${g.id}`,
    name: `Opsparing: ${g.name}`,
    kind: "opsparing" as const,
    amount: goalMonthly(g, now),
    interval: 1 as const,
    ownerId: g.ownerId,
    accountId: g.accountId,
    category: "Opsparing",
    history: [],
  }));
}

export function allItems(budget: Budget, now: Month): BudgetItem[] {
  return [...budget.items, ...goalItems(budget, now)];
}

const sum = (items: BudgetItem[]) => items.reduce((a, i) => a + monthly(i), 0);

/** Share of shared expenses per person, 0..1, summing to 1. */
export function shares(budget: Budget): Record<Id, number> {
  const ps = budget.persons;
  const out: Record<Id, number> = {};
  if (ps.length === 0) return out;
  if (ps.length === 1) {
    out[ps[0]!.id] = 1;
    return out;
  }
  if (budget.split.mode === "fixed") {
    const total = ps.reduce((a, p) => a + (budget.split.fixedPct[p.id] ?? 0), 0);
    for (const p of ps) out[p.id] = total > 0 ? (budget.split.fixedPct[p.id] ?? 0) / total : 1 / ps.length;
    return out;
  }
  if (budget.split.mode === "income") {
    const inc = ps.map((p) => sum(budget.items.filter((i) => i.kind === "indtægt" && i.ownerId === p.id)));
    const total = inc.reduce((a, b) => a + b, 0);
    if (total > 0) {
      ps.forEach((p, idx) => (out[p.id] = inc[idx]! / total));
      return out;
    }
  }
  for (const p of ps) out[p.id] = 1 / ps.length;
  return out;
}

export interface PersonSummary {
  personId: Id;
  name: string;
  share: number;
  income: number;
  ownExpenses: number;
  sharedExpenseShare: number;
  ownSavings: number;
  sharedSavingsShare: number;
  disposable: number;
  leftAfterSavings: number;
}

export interface Summary {
  income: number;
  expenses: number;
  savings: number;
  left: number;
  leftAfterSavings: number;
  /** Bank view: income minus fixed expenses that the bank counts. */
  bankExpenses: number;
  bankExcluded: { name: string; amount: number; id: Id }[];
  disposable: number;
  requirement: number;
  overRequirement: number;
  nextFreed: { month: Month; amount: number; name: string; overRequirement: number } | null;
  risingItems: BudgetItem[];
  persons: PersonSummary[];
}

/** Items whose latest amount change raised the amount by at least 10 % within the last 12 months. */
export function risingItems(items: BudgetItem[], today: string): BudgetItem[] {
  const cutoff = new Date(today);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return items.filter((i) => {
    const recent = i.history.filter((h) => new Date(h.date) >= cutoff);
    if (recent.length === 0) return false;
    const first = recent[0]!.from;
    return first > 0 && (i.amount - first) / first >= 0.1;
  });
}

export function summarize(budget: Budget, now: Month, today: string = `${now}-01`): Summary {
  const items = allItems(budget, now);
  const income = sum(items.filter((i) => i.kind === "indtægt"));
  const expenseItems = items.filter((i) => i.kind === "udgift");
  const expenses = sum(expenseItems);
  const savingItems = items.filter((i) => i.kind === "opsparing");
  const savings = sum(savingItems);
  const bankExpenses = sum(expenseItems.filter((i) => !i.bankExcluded));
  const bankExcluded = [...expenseItems.filter((i) => i.bankExcluded), ...savingItems]
    .map((i) => ({ id: i.id, name: i.name, amount: monthly(i) }))
    .filter((x) => x.amount > 0);
  const disposable = income - bankExpenses;
  const requirement = budget.persons.length * budget.bankRule.perAdult + budget.children * budget.bankRule.perChild;
  const overRequirement = disposable - requirement;
  const ls = loanSummary(budget, now);
  const nextFreed = ls.next?.endMonth
    ? {
        month: ls.next.endMonth,
        amount: ls.next.payment,
        name: ls.next.loan.name,
        overRequirement: overRequirement + ls.next.payment,
      }
    : null;

  const sh = shares(budget);
  const persons: PersonSummary[] = budget.persons.map((p) => {
    const share = sh[p.id] ?? 0;
    const inc = sum(items.filter((i) => i.kind === "indtægt" && i.ownerId === p.id));
    const ownExp = sum(expenseItems.filter((i) => i.ownerId === p.id));
    const sharedExp = sum(expenseItems.filter((i) => i.ownerId === null)) * share;
    const ownSav = sum(savingItems.filter((i) => i.ownerId === p.id));
    const sharedSav = sum(savingItems.filter((i) => i.ownerId === null)) * share;
    // Shared income (e.g. child benefit paid to a joint account) is split like expenses.
    const sharedInc = sum(items.filter((i) => i.kind === "indtægt" && i.ownerId === null)) * share;
    const disp = inc + sharedInc - ownExp - sharedExp;
    return {
      personId: p.id,
      name: p.name,
      share,
      income: inc + sharedInc,
      ownExpenses: ownExp,
      sharedExpenseShare: sharedExp,
      ownSavings: ownSav,
      sharedSavingsShare: sharedSav,
      disposable: disp,
      leftAfterSavings: disp - ownSav - sharedSav,
    };
  });

  return {
    income,
    expenses,
    savings,
    left: income - expenses,
    leftAfterSavings: income - expenses - savings,
    bankExpenses,
    bankExcluded,
    disposable,
    requirement,
    overRequirement,
    nextFreed,
    risingItems: risingItems(budget.items, today),
    persons,
  };
}

export interface AccountBalance {
  accountId: Id;
  inflow: number;
  outflow: number;
  net: number;
}

/**
 * Money in and out of each account per month, including standing transfers as computed.
 * Used for the per-account rows in the budget ("Dækket, overskud 150 kr").
 */
export function accountBalances(budget: Budget, now: Month, transfers: { from: Id; to: Id; amount: number }[]): AccountBalance[] {
  const items = allItems(budget, now);
  return budget.accounts.map((a) => {
    const inc = sum(items.filter((i) => i.accountId === a.id && i.kind === "indtægt"));
    const out = sum(items.filter((i) => i.accountId === a.id && i.kind !== "indtægt"));
    const tIn = transfers.filter((t) => t.to === a.id).reduce((s, t) => s + t.amount, 0);
    const tOut = transfers.filter((t) => t.from === a.id).reduce((s, t) => s + t.amount, 0);
    return { accountId: a.id, inflow: inc + tIn, outflow: out + tOut, net: inc + tIn - out - tOut };
  });
}
