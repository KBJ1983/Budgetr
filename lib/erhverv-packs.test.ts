import { describe, expect, it } from "vitest";
import { MAX_PACK_COUNT, PACK_COUNTS, PACK_MONTHS, isBilling, isPackCount, isPackMonths, MIN_CODE_MONTH, packMonthly, packPrice, packYearly, perCodeMonth, PRIVATE_MONTHLY } from "./erhverv-packs";

describe("Erhverv packs", () => {
  it("prices 50 codes on the list", () => {
    expect(PACK_MONTHS.map((m) => packPrice(50, m))).toEqual([2700, 4800, 9000, 16800]);
    expect(perCodeMonth(50, 12)).toBe(15);
  });

  it("adds up to the krone: whole kroner, month × months = total, month × 12 = year", () => {
    for (const c of PACK_COUNTS)
      for (const m of PACK_MONTHS) {
        for (const n of [perCodeMonth(c, m), packMonthly(c, m), packYearly(c, m), packPrice(c, m)]) expect(Number.isInteger(n)).toBe(true);
        expect(packMonthly(c, m)).toBe(c * perCodeMonth(c, m));
        expect(packMonthly(c, m) * m).toBe(packPrice(c, m));
        expect(packYearly(c, m)).toBe(m >= 12 ? packMonthly(c, m) * 12 : packPrice(c, m));
      }
  });

  it("makes a code-month cheaper with more months and more codes", () => {
    const pairs = <T,>(xs: readonly T[]) => xs.slice(1).map((x, i) => [xs[i] as T, x] as const);
    for (const c of PACK_COUNTS)
      for (const [a, b] of pairs(PACK_MONTHS)) expect(perCodeMonth(c, b)).toBeLessThan(perCodeMonth(c, a));
    for (const m of PACK_MONTHS)
      for (const [a, b] of pairs(PACK_COUNTS)) expect(perCodeMonth(b, m)).toBeLessThan(perCodeMonth(a, m));
  });

  it("never goes below the lowest price or up to the private price", () => {
    const all = PACK_COUNTS.flatMap((c) => PACK_MONTHS.map((m) => perCodeMonth(c, m)));
    expect(Math.min(...all)).toBe(MIN_CODE_MONTH);
    expect(Math.max(...all)).toBeLessThan(PRIVATE_MONTHLY);
  });

  it("knows its own sizes only", () => {
    expect(isPackCount(50)).toBe(true);
    expect(isPackCount(51)).toBe(false);
    expect(isPackCount(MAX_PACK_COUNT * 2)).toBe(false);
    expect(isPackMonths(12)).toBe(true);
    expect(isPackMonths("12")).toBe(false);
  });

  it("shows a pack a month and a year at a time", () => {
    expect(packMonthly(50, 12)).toBe(750);
    expect(packYearly(50, 12)).toBe(9000);
    expect(packMonthly(50, 24)).toBe(700);
    expect(packYearly(50, 24)).toBe(8400);
    expect(packPrice(50, 24)).toBe(16800);
    // Shorter than a year: the year is the whole pack.
    expect(packYearly(50, 3)).toBe(2700);
    expect(isBilling("aar")).toBe(true);
    expect(isBilling("uge")).toBe(false);
  });
});
