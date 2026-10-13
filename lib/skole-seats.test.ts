import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { giveAccess, releaseSeat } from "./agreements";
import { emptyLedger, type Org } from "./owner";
import { writeLedger } from "./owner-store";
import { DEMO_CLASS_ID, demoClass } from "./skole-demo";
import { EARLY_TEACHERS_UNTIL, claimWaitingSeat, requestSeat, takeSeat, teacherSeat } from "./skole-seats";
import { readTeacher, redeemTeacherLink, signupTeacher, type Teacher } from "./skole-teachers";

const now = new Date("2026-11-02T10:00:00Z");
const later = (days: number) => new Date(now.getTime() + days * 86_400_000);

const school: Org = {
  id: "o-skole",
  name: "Eksempel Skole",
  category: "skole",
  admins: ["admin@skole.dk"],
  packs: [{ id: "p-1", count: 2, months: 12, bought: "2026-10-01", sendBy: "2027-10-01" }],
};
const bank: Org = { id: "o-bank", name: "Banken", category: "bank", admins: ["a@banken.dk"], packs: [{ id: "p-b", count: 2, months: 3, bought: "2026-10-01", sendBy: "2027-10-01" }] };

describe("teacher seats", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-seats-"));
    await writeLedger({ ...emptyLedger(), orgs: [school, bank] }, dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const teacher = async (email: string, at = now): Promise<Teacher> => {
    const m = await signupTeacher({ name: "Lærer Test", school: "Eksempel Skole", email }, at, dir);
    return (await redeemTeacherLink(m!.token, at, dir))!;
  };

  it("gives a new teacher no seat, and an early teacher one until the end of the school year", async () => {
    expect(await teacherSeat(await teacher("ny@skole.dk"), now, dir)).toBeNull();
    const early = await teacher("tidlig@skole.dk", new Date("2026-10-01T10:00:00Z"));
    expect(await teacherSeat(early, now, dir)).toEqual({ until: EARLY_TEACHERS_UNTIL, school: "", early: true });
    expect(await teacherSeat(early, new Date(`${EARLY_TEACHERS_UNTIL}T12:00:00Z`), dir)).toBeNull();
  });

  it("takes a school seat with the code; a bank's code is refused without being spent", async () => {
    const t = await teacher("laerer@skole.dk");
    const fromBank = await giveAccess(bank, "laerer@skole.dk", now, dir);
    if (!fromBank.ok) throw new Error(fromBank.error);
    expect(await takeSeat(t, fromBank.code, now, dir)).toEqual({ ok: false, error: "notSchool" });
    expect((await giveAccess(bank, "laerer@skole.dk", now, dir)).ok).toBe(true); // still unused: sends again

    const g = await giveAccess(school, "en.anden@skole.dk", now, dir);
    if (!g.ok) throw new Error(g.error);
    const r = await takeSeat(t, g.code, now, dir);
    expect(r).toEqual({ ok: true, seat: { until: "2027-11-02", school: "Eksempel Skole" } });
    expect((await readTeacher(t.id, dir))?.seat).toMatchObject({ org: "o-skole", until: "2027-11-02" });
    expect(await teacherSeat((await readTeacher(t.id, dir))!, later(30), dir)).toMatchObject({ school: "Eksempel Skole" });
    expect(await teacherSeat((await readTeacher(t.id, dir))!, new Date("2027-11-02T12:00:00Z"), dir)).toBeNull();
  });

  it("takes a seat at once when one waits for the teacher's e-mail, and loses it when the school takes it back", async () => {
    const g = await giveAccess(school, "venter@skole.dk", now, dir);
    if (!g.ok) throw new Error(g.error);
    const t = await teacher("Venter@Skole.dk");
    expect(await claimWaitingSeat(t, now, dir)).toMatchObject({ school: "Eksempel Skole" });
    const saved = (await readTeacher(t.id, dir))!;
    expect(await claimWaitingSeat(saved, later(1), dir)).toMatchObject({ school: "Eksempel Skole" });
    await releaseSeat("o-skole", g.grant.id, dir);
    expect(await teacherSeat(saved, later(2), dir)).toBeNull();
    expect(await claimWaitingSeat(saved, later(2), dir)).toBeNull();
  });

  it("asks a school with an agreement for a seat, at most once a day", async () => {
    const t = await teacher("spoerger@skole.dk");
    expect(await requestSeat(t, "Ukendt Skole", now, dir)).toEqual({ ok: false, error: "unknown" });
    expect(await requestSeat(t, "Banken", now, dir)).toEqual({ ok: false, error: "unknown" });
    const r = await requestSeat(t, "Eksempel Skole", now, dir);
    expect(r.ok && r.org.id).toBe("o-skole");
    expect(await requestSeat((await readTeacher(t.id, dir))!, "Eksempel Skole", later(0.5), dir)).toEqual({ ok: false, error: "limit" });
    expect((await requestSeat((await readTeacher(t.id, dir))!, "Eksempel Skole", later(1.1), dir)).ok).toBe(true);
  });
});

describe("demo class", () => {
  it("shows made-up pupils at different steps, with choices and answers", () => {
    const { view, pupils } = demoClass(now);
    expect(view.id).toBe(DEMO_CLASS_ID);
    expect(view.rows).toHaveLength(6);
    expect(view.stats.started).toBe(5);
    expect(view.stats.finished).toBe(2);
    const first = pupils[view.codes[0]!]!;
    expect(first.choices.length).toBeGreaterThan(5);
    expect(first.answers.filter((a) => a.a).length).toBe(7);
    expect(pupils[view.codes.at(-1)!]!.choices).toEqual([]);
  });
});
