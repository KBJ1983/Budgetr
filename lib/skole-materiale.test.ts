import { describe, expect, it } from "vitest";
import { CASES, dreamMonthly, kr, STEP_COUNT, steps } from "./skole";
import { COURSE, LESSONS } from "./skole-materiale";

describe("skole-materiale", () => {
  it("has four lessons that together cover every step", () => {
    expect(LESSONS.map((l) => l.n)).toEqual([1, 2, 3, 4]);
    const covered = LESSONS.flatMap((l) => [...l.steps.matchAll(/\d+/g)].map((m) => Number(m[0])));
    // "Trin 1–2" etc.: the first and last step of each lesson, back to back.
    expect(covered).toEqual([1, 2, 3, 5, 6, 7, 8]);
    expect(Math.max(...covered)).toBe(STEP_COUNT);
  });

  it("asks the pupils' own reflection questions", () => {
    const sheetText = JSON.stringify(LESSONS.map((l) => l.sheet));
    for (const n of [3, 8]) expect(sheetText).toContain(steps(CASES[0]!)[n - 1]!.refl!);
  });

  it("gives the teacher the same numbers as the pupils' steps", () => {
    const pay = LESSONS[0]!.key.rows;
    CASES.forEach((c, i) => expect(pay[i]).toContain(kr(c.net)));
    const dream = LESSONS[2]!.key.rows;
    CASES.forEach((c, i) => expect(dream[i]).toContain(`${kr(dreamMonthly(c, 12))}/md.`));
  });

  it("keeps a key table's rows as wide as its head", () => {
    for (const l of LESSONS) for (const r of l.key.rows) expect(r).toHaveLength(l.key.cols.length);
  });

  it("describes the three people and says no names are kept", () => {
    expect(COURSE.people).toHaveLength(CASES.length);
    expect(COURSE.privacy).toContain("ingen navne");
  });
});
