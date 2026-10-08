import { describe, expect, it } from "vitest";
import { canNext, caseById, dreamMonthly, emptyFlow, isOk, kr, scenarios, signedKr, steps, totals, type Flow } from "./skole";

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
