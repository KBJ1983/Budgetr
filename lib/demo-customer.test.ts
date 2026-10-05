import { describe, expect, it } from "vitest";
import { isBudget } from "./budget-file";
import { DEMO_USER, demoCustomer } from "./demo-customer";
import { userById } from "./users";

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("demo customer", () => {
  const b = demoCustomer(new Date(2026, 9, 5)) as Any;

  it("is a test user, so it needs no session", () => {
    expect(userById(DEMO_USER)?.logins).toEqual(["DEMO"]);
  });

  it("is a valid budget, and so is every draft", () => {
    expect(isBudget(b)).toBe(true);
    for (const d of b.drafts) expect(isBudget(d.data)).toBe(true);
  });

  it("uses every kind of draft, scenarios, goal modes and loan states", () => {
    expect(b.drafts.map((d: Any) => d.mode).sort()).toEqual(["blank", "copy", "prev"]);
    expect(b.drafts.some((d: Any) => d.files.length > 0)).toBe(true);
    expect(b.scenarios.length).toBeGreaterThanOrEqual(2);
    expect(new Set(b.goals.map((g: Any) => g.mode))).toEqual(new Set(["target", "monthly"]));
    expect(b.loans.some((l: Any) => l.paused)).toBe(true);
    expect(b.loans.some((l: Any) => l.include === false)).toBe(true);
    expect(b.entries.some((e: Any) => e.history?.length)).toBe(true);
  });

  it("only refers to ids that exist", () => {
    const acc = new Set(b.accounts.map((a: Any) => a.id));
    const sc = new Set(["base", ...b.scenarios.map((s: Any) => s.id)]);
    const ids = b.entries.map((e: Any) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of b.entries) {
      if (e.type === "overfoersel") expect(acc.has(e.from) && acc.has(e.to)).toBe(true);
      else expect(acc.has(e.account)).toBe(true);
    }
    for (const g of b.goals) for (const k of g.scopes) expect(sc.has(k)).toBe(true);
    for (const s of b.scenarios) for (const id of Object.keys(s.overrides)) expect(ids).toContain(id);
    for (const l of b.loans) if (l.link) expect(ids).toContain(l.link);
  });

  it("holds no e-mail addresses or account numbers", () => {
    const text = JSON.stringify(b);
    expect(text).not.toMatch(/@/);
    for (const a of b.accounts) expect(a.number).toBe("");
  });
});
