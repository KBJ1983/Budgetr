import { describe, expect, it } from "vitest";
import {
  boligLevel, budgetNumbers, canNext, caseById, dreamMonthly, emptyFlow, isCode, isOk, kr, monthly, normalizeCode, opsLevel, randomCode, scenarios, seedPosts,
  signedKr, steps, totals, type Flow,
} from "./skole";

/** Sara in a shared flat, all fixed costs, "Normalt" food and clothes. */
const sara = (patch: Partial<Flow> = {}): Flow => ({
  ...emptyFlow(),
  caseId: "sara",
  bolig: 4800,
  mad: 2800,
  toj: 1500,
  step: 6,
  maxStep: 6,
  ...patch,
});

describe("skole money", () => {
  it("formats kroner the Danish way with a real minus sign", () => {
    expect(kr(15200)).toBe("15.200 kr.");
    expect(kr(-480)).toBe("−480 kr.");
    expect(kr(-0.4)).toBe("0 kr.");
    expect(signedKr(2473)).toBe("+2.473 kr.");
    expect(signedKr(-3700)).toBe("−3.700 kr.");
    expect(signedKr(0)).toBe("0 kr.");
  });

  it("rounds the dream saving up to whole 50 kr.", () => {
    expect(dreamMonthly(caseById("sara"), 12)).toBe(1500);
    expect(dreamMonthly(caseById("mira"), 12)).toBe(700);
  });

  it("adds up the month", () => {
    expect(totals(sara())).toEqual({
      income: 15200,
      bolig: 4800,
      faste: 1627,
      fasteBase: 1627,
      hverdag: 4300,
      opsparing: 2000,
      spend: 12727,
      left: 2473,
      leftBase: 2473,
    });
  });

  it("counts savings only from step 6", () => {
    expect(totals(sara({ step: 5, maxStep: 5 })).left).toBe(4473);
  });

  it("applies the what-if scenarios, but not to leftBase", () => {
    const t = totals(sara({ scen: { rent: true, job: true } }));
    expect(t.income).toBe(11500);
    expect(t.bolig).toBe(5280);
    expect(t.left).toBe(-1707);
    expect(t.leftBase).toBe(2473);
    const u = totals(sara({ scen: { together: true, car: true } }));
    expect(u.bolig).toBe(2400);
    expect(u.faste).toBe(3727);
    expect(u.fasteBase).toBe(1627);
    expect(u.left).toBe(2773);
  });

  it("counts own fixed costs and own savings", () => {
    const t = totals(sara({ cFaste: [{ name: "Fitness", amt: 250 }], cOps: [{ name: "Ferie", amt: 300 }] }));
    expect(t.fasteBase).toBe(1877);
    expect(t.opsparing).toBe(2300);
    expect(t.left).toBe(1923);
  });

  it("lists the scenarios with their effect on the month", () => {
    expect(scenarios(caseById("sara"), 4800).map((s) => [s.key, s.delta])).toEqual([
      ["rent", -480],
      ["job", -3700],
      ["together", 2400],
      ["car", -2100],
    ]);
  });

  it("knows when the pupil may go on", () => {
    expect(canNext({ ...emptyFlow(), step: 1 }, false)).toBe(false);
    expect(canNext({ ...emptyFlow(), step: 1, caseId: "jonas" }, false)).toBe(true);
    expect(canNext(sara({ step: 2 }), false)).toBe(false);
    expect(canNext(sara({ step: 2 }), true)).toBe(true);
    expect(canNext(sara({ step: 3, bolig: null }), true)).toBe(false);
    expect(canNext(sara({ step: 5, toj: null }), true)).toBe(false);
    expect(canNext(sara({ step: 5 }), true)).toBe(true);
    expect(canNext(sara({ step: 8 }), true)).toBe(true);
  });

  it("says whether the budget adds up once step 7 is reached", () => {
    expect(isOk(sara())).toBeNull();
    expect(isOk(sara({ step: 7, maxStep: 7 }))).toBe(true);
    expect(isOk(sara({ step: 7, maxStep: 7, scen: { job: true, rent: true } }))).toBe(true);
    expect(isOk({ ...sara({ step: 7, maxStep: 7 }), caseId: "mira", bolig: 6900 })).toBe(false);
  });

  it("names the case in the step questions", () => {
    const s = steps(caseById("jonas"));
    expect(s).toHaveLength(8);
    expect(s[2].q).toBe("Hvor skal Jonas bo?");
    expect(s[0].fact).toBeUndefined();
    expect(s[7].refl).toBe("Hvilket scenarie rammer hårdest?");
  });
});

describe("Mit budget", () => {
  it("seeds the posts from the choices, with insurance as a yearly post", () => {
    const posts = seedPosts(sara());
    expect(posts.find((p) => p.name === "Forsikring")).toMatchObject({ cat: "faste", amt: 1800, freq: "aar" });
    expect(posts.find((p) => p.cat === "bolig")?.name).toBe("Husleje, delelejlighed");
    expect(posts.filter((p) => p.cat === "ops").map((p) => [p.name, p.amt])).toEqual([["Buffer", 500], ["Kørekort", 1500]]);
    expect(new Set(posts.map((p) => p.id)).size).toBe(posts.length);
    expect(monthly({ id: "x", cat: "faste", name: "Forsikring", amt: 1800, freq: "aar" })).toBe(150);
    expect(monthly({ id: "x", cat: "faste", name: "Tandlæge", amt: 600, freq: "kv" })).toBe(200);
  });

  it("works out the key numbers", () => {
    const n = budgetNumbers(seedPosts(sara()), caseById("sara"));
    expect(n).toEqual({
      income: 15200,
      byCat: { ind: 15200, bolig: 4800, faste: 1627, hverdag: 4300, ops: 2000 },
      left: 2473,
      raad: 8773,
      boligPct: 32,
      opsPct: 13,
      monthsToDream: 12,
    });
    expect(budgetNumbers([], caseById("sara"))).toMatchObject({ income: 0, boligPct: 0, monthsToDream: null });
  });

  it("grades housing and savings by the rules of thumb", () => {
    expect([30, 31, 40, 41].map(boligLevel)).toEqual([0, 1, 1, 2]);
    expect([10, 9, 5, 4].map(opsLevel)).toEqual([0, 1, 1, 2]);
  });
});

describe("pupil codes", () => {
  it("reads a code however it is typed", () => {
    expect(normalizeCode(" blå orm 47 ")).toBe("BLÅ-ORM-47");
    expect(normalizeCode("gul--ræv-12")).toBe("GUL-RÆV-12");
  });

  it("knows the format COLOUR-ANIMAL-10..99", () => {
    expect(isCode("BLÅ-ORM-47")).toBe(true);
    expect(isCode("SJOV-FRØ-99")).toBe(true);
    expect(isCode("BLÅ-ORM-09")).toBe(false);
    expect(isCode("BLAA-ORM-47")).toBe(false);
    expect(isCode("BLÅ-ORM-47-1")).toBe(false);
  });

  it("makes codes in that format", () => {
    expect(randomCode(() => 0)).toBe("BLÅ-ORM-10");
    expect(randomCode(() => 0.999)).toBe("SJOV-FRØ-99");
    for (let i = 0; i < 200; i++) expect(isCode(randomCode())).toBe(true);
  });
});