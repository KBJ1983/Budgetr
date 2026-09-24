import { describe, expect, it } from "vitest";
import { accountBalances, goalMonthly, shares, summarize } from "./calc";
import { exampleBudget } from "./example";
import { addMonths, durationLabel, kr, monthLabel, monthsBetween } from "./format";
import { analyzeImport, parseAmount, parseCsv, parseDate, rowsToTransactions } from "./importer";
import { loanSummary, monthsToPayOff } from "./loans";
import { applyScenario, compareScenario } from "./scenario";
import { computeTransfers } from "./transfers";
import type { SavingsGoal } from "./types";

const NOW = new Date(2026, 8, 24); // 24 Sep 2026
const M = "2026-09";

describe("format", () => {
  it("formats kroner the Danish way with a real minus sign", () => {
    expect(kr(64200)).toBe("64.200 kr");
    expect(kr(-2400)).toBe("−2.400 kr");
    expect(kr(1500, { sign: true })).toBe("+1.500 kr");
  });
  it("does month arithmetic", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthsBetween("2026-09", "2029-06")).toBe(33);
    expect(monthLabel("2027-03")).toBe("mar 2027");
    expect(durationLabel(19)).toBe("1 år 7 md.");
    expect(durationLabel(6)).toBe("6 md.");
  });
});

describe("loans", () => {
  it("computes payoff months with and without interest", () => {
    expect(monthsToPayOff(12000, 0, 1000)).toBe(12);
    expect(monthsToPayOff(100000, 5, 400)).toBe(Infinity);
    // 36.500 at 8,95 % with 2.100/md ≈ 19–20 months
    const n = monthsToPayOff(36500, 8.95, 2100);
    expect(n).toBeGreaterThanOrEqual(19);
    expect(n).toBeLessThanOrEqual(20);
  });
  it("builds cumulative steps in payoff order", () => {
    const s = loanSummary(exampleBudget(NOW), M);
    expect(s.steps.map((x) => x.name)[0]).toBe("Billån");
    expect(s.next?.endMonth).toBe("2027-03");
    expect(s.freedTotal).toBe(1600 + 2100 + 1850 + 2300);
    expect(s.freedWithin12).toBe(1600);
  });
});

describe("summary", () => {
  const b = exampleBudget(NOW);
  const s = summarize(b, M);
  it("adds incomes and expenses as monthly amounts", () => {
    expect(s.income).toBe(33500 + 26900 + 11400 / 3);
    expect(s.left).toBeCloseTo(s.income - s.expenses);
    expect(s.leftAfterSavings).toBeCloseTo(s.left - s.savings);
  });
  it("leaves food and gifts out of the bank view", () => {
    expect(s.expenses - s.bankExpenses).toBe(5200 + 200);
    expect(s.bankExcluded.map((x) => x.name)).toContain("Mad og husholdning");
    expect(s.requirement).toBe(2 * 6000 + 2 * 3250);
    expect(s.nextFreed?.overRequirement).toBe(s.overRequirement + 1600);
  });
  it("splits shared costs by income", () => {
    const sh = shares(b);
    expect(sh.anna! + sh.jonas!).toBeCloseTo(1);
    expect(sh.anna).toBeCloseTo(33500 / (33500 + 26900));
    const sumDisp = s.persons.reduce((a, p) => a + p.disposable, 0);
    expect(sumDisp).toBeCloseTo(s.left);
  });
  it("splits equally and by fixed percent", () => {
    expect(shares({ ...b, split: { mode: "equal", fixedPct: {} } }).anna).toBe(0.5);
    expect(shares({ ...b, split: { mode: "fixed", fixedPct: { anna: 60, jonas: 40 } } }).jonas).toBeCloseTo(0.4);
  });
  it("flags items that rose 10 % or more", () => {
    expect(s.risingItems.map((i) => i.id)).toEqual(["el"]);
  });
});

describe("goals", () => {
  const g: SavingsGoal = {
    id: "g", name: "Hus", color: "", mode: "target", target: 250000, deadline: "2029-06",
    monthly: 0, saved: 95000, extras: [], ownerId: null, accountId: "x",
  };
  it("spreads the rest over the months left", () => {
    expect(goalMonthly(g, M)).toBe(Math.ceil(155000 / 33));
  });
  it("counts extra deposits before the deadline", () => {
    const withExtra = { ...g, extras: [{ id: "e", month: "2027-05", amount: 33000, note: "" }] };
    expect(goalMonthly(withExtra, M)).toBe(Math.ceil(122000 / 33));
  });
  it("is zero when reached", () => {
    expect(goalMonthly({ ...g, saved: 260000 }, M)).toBe(0);
  });
});

describe("transfers", () => {
  const b = exampleBudget(NOW);
  const t = computeTransfers(b, M);
  it("tops up every shared account so it is covered", () => {
    const bal = accountBalances(b, M, t);
    for (const a of bal.filter((x) => x.accountId === "budget" || x.accountId === "opsparing")) {
      expect(a.net).toBeGreaterThanOrEqual(0);
      expect(a.net).toBeLessThan(300);
    }
  });
  it("flags the transfer that differs from the net bank", () => {
    const flagged = t.filter((x) => x.needsUpdate);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]!.from).toBe("jonas-lon");
    expect(flagged[0]!.amount - flagged[0]!.registered!).toBe(500);
  });
});

describe("scenarios", () => {
  const b = exampleBudget(NOW);
  const sc = b.scenarios[0]!;
  it("applies changes without touching the original", () => {
    const alt = applyScenario(b, sc);
    expect(alt.items.find((i) => i.id === "husleje")).toBeUndefined();
    expect(b.items.find((i) => i.id === "husleje")).toBeDefined();
    expect(alt.goals.find((g) => g.id === "hus")).toBeUndefined();
  });
  it("reports the difference versus now", () => {
    const c = compareScenario(b, sc, M);
    expect(c.expenses).toBeCloseTo(-9800 + 11200 + 9600 / 6 + (1900 - 950));
    expect(c.lines.find((l) => l.label === "Husleje")?.delta).toBe(-9800);
  });
});

describe("import", () => {
  it("parses Danish numbers and dates", () => {
    expect(parseAmount("-1.234,56")).toBeCloseTo(-1234.56);
    expect(parseAmount("−2.455,00 kr")).toBe(-2455);
    expect(parseAmount("1.500")).toBe(1500);
    expect(parseAmount("12.5")).toBe(12.5);
    expect(parseAmount("tekst")).toBeNaN();
    expect(parseDate("03-09-2026")).toBe("2026-09-03");
    expect(parseDate("2026-09-03")).toBe("2026-09-03");
  });

  const csv = [
    "Dato;Tekst;Beløb;Saldo",
    '01-07-2026;"NORLYS 88213 El";-2.455,00;10.000,00',
    "01-08-2026;NORLYS 88213 El;-2.455,00;9.000,00",
    "01-09-2026;NORLYS 88213 El;-2.610,00;8.000,00",
    "02-07-2026;Husleje LEJE 4471;-9.800,00;1,00",
    "02-09-2026;Husleje LEJE 4471;-9.800,00;1,00",
    "05-07-2026;Podimo abonnement 7788;-99,00;1,00",
    "05-08-2026;Podimo abonnement 7791;-99,00;1,00",
    "05-09-2026;Podimo abonnement 7795;-99,00;1,00",
    "10-07-2026;Netto 123;-412,50;1,00",
    "10-08-2026;Netto 123;-380,00;1,00",
    "10-09-2026;Netto 123;-441,25;1,00",
  ].join("\n");

  it("finds columns, matches items and suggests new fixed payments", () => {
    const rows = parseCsv(csv);
    const txs = rowsToTransactions(rows);
    expect(txs).toHaveLength(11);
    const b = exampleBudget(NOW);
    const r = analyzeImport(b.items, txs);
    const el = r.matches.find((m) => m.itemId === "el");
    expect(el).toMatchObject({ newAmount: 2610, diff: 155, by: "aftalenr." });
    expect(r.matches.find((m) => m.itemId === "husleje")?.diff).toBe(0);
    expect(r.suggestions.map((s) => s.name)).toEqual(["Podimo abonnement 7795"]);
    expect(r.suggestions[0]).toMatchObject({ amount: 99, interval: 1 });
  });

  it("works without a header row", () => {
    const txs = rowsToTransactions([
      ["2026-09-01", "Husleje", "-9800"],
      ["2026-08-01", "Husleje", "-9800"],
    ]);
    expect(txs).toHaveLength(2);
    expect(txs[0]).toEqual({ date: "2026-09-01", text: "Husleje", amount: -9800 });
  });
});
