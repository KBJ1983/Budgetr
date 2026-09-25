import { counts, monthly, summarize } from "./calc";
import type { Budget, BudgetItem, Month, Scenario } from "./types";

/** The budget as it would look with the scenario's changes applied. Pure; the input is untouched. */
export function applyScenario(budget: Budget, scenario: Scenario | undefined): Budget {
  if (!scenario) return budget;
  let items = budget.items.map((i) => ({ ...i }));
  let goals = budget.goals;
  for (const c of scenario.changes) {
    if (c.kind === "setAmount") items = items.map((i) => (i.id === c.itemId ? { ...i, amount: c.amount } : i));
    else if (c.kind === "editItem") items = items.map((i) => (i.id === c.itemId ? { ...i, ...c.patch } : i));
    else if (c.kind === "removeItem") items = items.filter((i) => i.id !== c.itemId);
    else if (c.kind === "addItem") items = [...items, c.item];
    else if (c.kind === "removeGoal") goals = goals.filter((g) => g.id !== c.goalId);
  }
  const itemIds = new Set(items.map((i) => i.id));
  return { ...budget, items, goals, loans: budget.loans.filter((l) => itemIds.has(l.itemId)) };
}

export interface ScenarioLine {
  label: string;
  /** Monthly difference versus the current budget; null when a line was removed without an amount. */
  delta: number | null;
  removed?: boolean;
  added?: boolean;
}

export interface ScenarioComparison {
  income: number;
  expenses: number;
  leftAfterSavings: number;
  disposable: number;
  savings: number;
  lines: ScenarioLine[];
}

export function compareScenario(budget: Budget, scenario: Scenario, now: Month): ScenarioComparison {
  const base = summarize(budget, now);
  const alt = summarize(applyScenario(budget, scenario), now);
  const lines: ScenarioLine[] = scenario.changes.map((c) => {
    if (c.kind === "setAmount") {
      const item = budget.items.find((i) => i.id === c.itemId);
      if (!item) return { label: "Ukendt post", delta: 0 };
      return { label: item.name, delta: (c.amount - item.amount) / item.interval };
    }
    if (c.kind === "editItem") {
      const item = budget.items.find((i) => i.id === c.itemId);
      if (!item) return { label: "Ukendt post", delta: 0 };
      const after = { ...item, ...c.patch };
      const m = (i: BudgetItem) => (counts(i) ? monthly(i) : 0);
      return { label: after.name, delta: m(after) - m(item), added: !counts(item) && counts(after) };
    }
    if (c.kind === "removeItem") {
      const item = budget.items.find((i) => i.id === c.itemId);
      return { label: item?.name ?? "Ukendt post", delta: item && counts(item) ? -monthly(item) : 0, removed: true };
    }
    if (c.kind === "addItem") return { label: c.item.name, delta: monthly(c.item), added: true };
    const goal = budget.goals.find((g) => g.id === c.goalId);
    return { label: `Opsparing: ${goal?.name ?? "mål"}`, delta: null, removed: true };
  });
  return {
    income: alt.income - base.income,
    expenses: alt.expenses - base.expenses,
    savings: alt.savings - base.savings,
    leftAfterSavings: alt.leftAfterSavings - base.leftAfterSavings,
    disposable: alt.disposable - base.disposable,
    lines,
  };
}
