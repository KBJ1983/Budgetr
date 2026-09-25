import { describe, expect, it } from "vitest";
import { summarize } from "./calc";
import { extractLegacySeed, fromLegacy, type LegacyState } from "./legacy";
import { loanStatus } from "./loans";
import { applyScenario } from "./scenario";
import { computeTransfers } from "./transfers";

// Invented fixture in the prototype's format (not real data).
const legacy: LegacyState = {
  accounts: [
    { id: "budget", name: "Budgetkonto", number: "1234 5678", owner: "", type: "faelles" },
    { id: "p1", name: "Per – Dankonto", owner: "p1", type: "personlig" },
    { id: "p2", name: "Lise – Dankonto", owner: "p2", type: "personlig" },
    { id: "ops", name: "Opsparing Hus", owner: "", type: "personlig" },
  ],
  entries: [
    { id: "e1", type: "indtaegt", desc: "Løn Per", amount: 30000, freq: 1, account: "p1", payer: "p1", category: "Løn" },
    { id: "e2", type: "indtaegt", desc: "Løn Lise", amount: 20000, freq: 1, account: "p2", payer: "p2", category: "Løn" },
    { id: "t1", type: "overfoersel", desc: "Per til budget", amount: 15000, freq: 1, from: "p1", to: "budget" },
    { id: "e3", type: "udgift", desc: "Fjernvarme", amount: 3000, freq: 2, account: "budget", payer: "faelles", category: "Bolig", key: "0171" },
    { id: "e4", type: "udgift", desc: "Mad", amount: 6000, freq: 1, account: "budget", payer: "faelles", category: "Husholdning" },
    { id: "e5", type: "udgift", desc: "Gaver", amount: 6000, freq: 12, account: "budget", payer: "faelles", category: "Øvrigt" },
    { id: "e6", type: "udgift", desc: "Kontingent", amount: 1200, freq: 12, account: "budget", payer: "faelles", category: "Husholdning", bank: true },
    { id: "e7", type: "udgift", desc: "Billån", amount: 2000, freq: 1, account: "budget", payer: "faelles", category: "Lån" },
    { id: "e8", type: "udgift", desc: "SU-lån", amount: 0, freq: 1, account: "budget", payer: "faelles", category: "Lån", active: false, note: "Pause" },
    { id: "e9", type: "udgift", desc: "Odd", amount: 800, freq: 4, account: "budget", payer: "p1", category: "" },
  ],
  loans: [
    { id: "l1", bank: "Bank A", desc: "Bil", link: "e7", monthly: 2000, original: 100000, rate: 5, rest: 40000, ends: "2028 - jan" },
    { id: "l2", bank: "Staten", desc: "Studielån", link: "e8", monthly: 1500, original: 90000, rate: "", rest: 60000, paused: true },
    { id: "l3", bank: "X", desc: "Uden link", link: "nope", rest: 1 },
  ],
  goals: [
    { id: "g1", name: "Hus", target: 100000, saved: 20000, end: "2028-12-01", from: "budget", payer: "faelles", extras: [{ amount: 5000, date: "2027-01-01", desc: "bonus" }] },
    { id: "g2", name: "Pers opsparing", mode: "monthly", monthly: 1000, from: "p1", payer: "p1" },
  ],
  persons: [
    { id: "p1", name: "Per", extras: [{ amount: 3000, desc: "Fritvalg" }, { amount: 0, desc: "" }] },
    { id: "p2", name: "Lise", extras: [] },
  ],
  scenarios: [
    {
      id: "s1",
      name: "Efter 2027",
      overrides: {
        e1: { amount: 32000 },
        e5: { removed: true },
        e8: { active: true, amount: 1500, bank: true },
        ghost: { amount: 1 },
      },
      added: [{ id: "a1", type: "udgift", desc: "Efterskole", amount: 7000, freq: 1, account: "budget", payer: "faelles", bank: true }],
    },
  ],
  settings: { split: "indkomst", bank: { adults: 12000, children: 2, childRate: 2500, withExtra: true } },
};

const NOW = new Date(2026, 8, 25);
const b = fromLegacy(legacy, { id: "x", now: NOW });

describe("fromLegacy", () => {
  it("maps people, accounts and settings", () => {
    expect(b.name).toBe("Per og Lises budget");
    expect(b.children).toBe(2);
    expect(b.bankRule).toEqual({ perAdult: 6000, perChild: 2500, withExtra: true });
    expect(b.split.mode).toBe("income");
    expect(b.accounts.map((a) => a.kind)).toEqual(["budget", "løn", "løn", "opsparing"]);
    expect(b.accounts[0]!.number).toBe("1234 5678");
  });

  it("maps entries, bank exclusion, intervals and inactive lines", () => {
    const it = (id: string) => b.items.find((i) => i.id === id)!;
    expect(it("e3")).toMatchObject({ interval: 2, agreementNo: "0171", ownerId: null });
    expect(it("e4").bankExcluded).toBe(true); // Husholdning
    expect(it("e5").bankExcluded).toBe(true); // gave in the name
    expect(it("e6").bankExcluded).toBeUndefined(); // explicit bank: true wins
    expect(it("e8")).toMatchObject({ active: false, note: "Pause" });
    expect(it("e9")).toMatchObject({ interval: 1, amount: 200, category: "Andet", ownerId: "p1" }); // freq 4 → monthly
  });

  it("turns transfers into registered net-bank transfers, not items", () => {
    expect(b.items.some((i) => i.id === "t1")).toBe(false);
    expect(b.registeredTransfers).toEqual({ "p1>budget": 15000 });
    expect(computeTransfers(b, "2026-09").find((t) => t.key === "p1>budget")?.registered).toBe(15000);
  });

  it("keeps extra earnings out of the budget but in the bank view", () => {
    const x = b.items.filter((i) => i.extra);
    expect(x).toHaveLength(1);
    expect(x[0]).toMatchObject({ name: "Fritvalg Per", amount: 3000, ownerId: "p1", accountId: "p1" });
    const s = summarize(b, "2026-09");
    expect(s.income).toBe(50000);
    expect(s.extraIncome).toBe(3000);
    expect(s.bankIncome).toBe(53000);
  });

  it("links loans, keeps lender data and pauses", () => {
    expect(b.loans.map((l) => l.id)).toEqual(["l1", "l2"]);
    const [l1, l2] = b.loans;
    expect(l1).toMatchObject({ itemId: "e7", bank: "Bank A", bankEnd: "2028 - jan", ratePct: 5 });
    expect(l1!.payment).toBeUndefined(); // same as the budget line
    expect(l2).toMatchObject({ paused: true, payment: 1500, ratePct: 0, note: "Rente ikke angivet" });
    expect(b.items.find((i) => i.id === "e7")?.loanId).toBe("l1");
    expect(loanStatus(b, l2!, "2026-09").endMonth).toBeNull();
    expect(loanStatus(b, l1!, "2026-09").endMonth).not.toBeNull();
  });

  it("maps goals", () => {
    expect(b.goals[0]).toMatchObject({ mode: "target", target: 100000, saved: 20000, deadline: "2028-12", accountId: "budget", ownerId: null });
    expect(b.goals[0]!.extras[0]).toMatchObject({ month: "2027-01", amount: 5000, note: "bonus" });
    expect(b.goals[1]).toMatchObject({ mode: "monthly", monthly: 1000, ownerId: "p1", accountId: "p1" });
  });

  it("maps scenario overrides and added lines", () => {
    const sc = b.scenarios[0]!;
    expect(sc.changes).toHaveLength(4); // ghost override is dropped
    const alt = applyScenario(b, sc);
    expect(alt.items.find((i) => i.id === "e1")?.amount).toBe(32000);
    expect(alt.items.find((i) => i.id === "e5")).toBeUndefined();
    expect(alt.items.find((i) => i.id === "e8")).toMatchObject({ active: true, amount: 1500, bankExcluded: false });
    expect(alt.items.find((i) => i.id === "a1")?.name).toBe("Efterskole");
    const base = summarize(b, "2026-09");
    const s = summarize(alt, "2026-09");
    expect(s.expenses - base.expenses).toBeCloseTo(1500 + 7000 - 500);
  });
});

describe("extractLegacySeed", () => {
  it("reads the seed from the prototype HTML, also when escaped inside the bundle", () => {
    const json = JSON.stringify({ persons: [], accounts: [], entries: [] });
    expect(extractLegacySeed(`<p><script type="application/json" id="seed">${json}</script>`).persons).toEqual([]);
    expect(extractLegacySeed(`x<script type="application/json" id="seed">${json}@@ENDSCRIPT@@>more`).entries).toEqual([]);
  });
});
