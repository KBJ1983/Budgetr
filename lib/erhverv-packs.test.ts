import { describe, expect, it } from "vitest";
import { PACK_COUNTS, PACK_MONTHS, isBilling, isPackCount, isPackMonths, packMonthly, packPrice, packYearly, perCodeMonth } from "./erhverv-packs";

describe("Erhverv packs", () => {
  it("prices 50 codes on the list", () => {
    expect(PACK_MONTHS.map((m) => packPrice(50, m))).toEqual([2495, 4195, 7195, 11995]);
    expect(perCodeMonth(50, 12)).toBe(12);
  });

  it("makes a code-month cheaper with more months and more codes", () => {
    const pairs = <T,>(xs: readonly T[]) => xs.slice(1).map((x, i) => [xs[i] as T, x] as const);
    for (const c of PACK_COUNTS)
      for (const [a, b] of pairs(PACK_MONTHS)) expect(perCodeMonth(c, b)).toBeLessThanOrEqual(perCodeMonth(c, a));
    for (const m of PACK_MONTHS)
      for (const [a, b] of pairs(PACK_COUNTS)) expect(packPrice(b, m) / b).toBeLessThan(packPrice(a, m) / a);
  });

  it("knows its own sizes only", () => {
    expect(isPackCount(50)).toBe(true);
    expect(isPackCount(51)).toBe(false);
    expect(isPackMonths(12)).toBe(true);
    expect(isPackMonths("12")).toBe(false);
  });

  it("shows a pack a month and a year at a time", () => {
    expect(packMonthly(50, 12)).toBe(600);
    expect(packYearly(50, 12)).toBe(7195);
    expect(packMonthly(50, 24)).toBe(500);
    expect(packYearly(50, 24)).toBe(5998);
    // Shorter than a year: the year is the whole pack.
    expect(packYearly(50, 3)).toBe(2495);
    expect(isBilling("aar")).toBe(true);
    expect(isBilling("uge")).toBe(false);
  });
});
