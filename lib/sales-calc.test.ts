import { describe, expect, it } from "vitest";
import { DEFAULT_CALC, calc, toCalcInput } from "./sales-calc";

describe("sales calculator", () => {
  it("adds up agreements, school packs and private customers in whole kroner a year", () => {
    const r = calc({
      target: 0,
      bank: { deals: 2, count: 50, months: 12 }, // 50 × 15 kr = 750 kr/md → 9.000 kr/år
      maegler: { deals: 1, count: 10, months: 3 }, // 10 × 22 kr = 220 kr/md → 2.640 kr/år
      schoolSmall: 1,
      schoolBig: 2,
      privateMonthly: 10, // 29 × 12 = 348
      privateYearly: 5, // 296
    });
    expect(r.lines.map((l) => [l.id, l.year])).toEqual([
      ["bank", 18_000],
      ["maegler", 2_640],
      ["skole", 13_000],
      ["privat", 4_960],
    ]);
    expect(r.year).toBe(38_600);
    expect(r).toMatchObject({ gap: 0, toClose: [] });
  });

  it("says what is missing to the target and what alone would close it", () => {
    const r = calc({ ...DEFAULT_CALC, bank: { deals: 0, count: 100, months: 12 }, maegler: { deals: 0, count: 25, months: 12 }, schoolSmall: 0, schoolBig: 0, privateMonthly: 0, privateYearly: 0, target: 100_000 });
    expect(r.gap).toBe(100_000);
    // 100 × 14 × 12 = 16.800 a bank deal → 6; 25 × 16 × 12 = 4.800 → 21; 5.000 → 20; 348 → 288.
    expect(r.toClose.map((x) => x.n)).toEqual([6, 21, 20, 288]);
  });

  it("cleans what the form holds, falling back to the defaults", () => {
    expect(toCalcInput({ target: "-5", bank: { deals: "4", count: "33", months: "24" }, schoolBig: "2.7" })).toMatchObject({
      target: 0,
      bank: { deals: 4, count: DEFAULT_CALC.bank.count, months: 24 },
      schoolBig: 2,
      privateMonthly: DEFAULT_CALC.privateMonthly,
    });
  });
});
