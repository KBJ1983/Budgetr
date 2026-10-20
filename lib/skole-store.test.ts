import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "./kv";
import { emptyFlow, isCode, type Flow } from "./skole";
import {
  adoptLegacyClasses, classOverview, classPupil, codeKey, createClass, deleteClass, emailHash, lookupCode, readClassFor, saveProgress, teacherClasses,
} from "./skole-store";

const now = new Date("2026-10-08T08:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const after = (days: number) => new Date(now.getTime() + days * DAY_MS);
const T1 = "t-aaaaaaaaaa";
const T2 = "t-bbbbbbbbbb";

describe("skole store", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-skole-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("makes a class with unique codes that only its teacher can open", async () => {
    const cls = await createClass({ trin: 8, count: 24, days: 90, teacherId: T1 }, now, dir);
    expect(cls.id).toMatch(/^[0-9a-f]{10}$/);
    expect(cls.codes).toHaveLength(24);
    expect(new Set(cls.codes).size).toBe(24);
    expect(cls.codes.every(isCode)).toBe(true);
    expect((await readClassFor(T1, cls.id, now, dir))?.id).toBe(cls.id);
    expect(await readClassFor(T2, cls.id, now, dir)).toBeNull();
    expect(await readClassFor(T1, "nonsense", now, dir)).toBeNull();
  });

  it("refuses odd classes", async () => {
    await expect(createClass({ trin: 6, count: 10, days: 90, teacherId: T1 }, now, dir)).rejects.toThrow();
    await expect(createClass({ trin: 8, count: 0, days: 90, teacherId: T1 }, now, dir)).rejects.toThrow();
    await expect(createClass({ trin: 8, count: 41, days: 90, teacherId: T1 }, now, dir)).rejects.toThrow();
    await expect(createClass({ trin: 8, count: 10, days: 45, teacherId: T1 }, now, dir)).rejects.toThrow();
  });

  it("lists the teacher's classes, newest first, with how far the pupils are", async () => {
    const a = await createClass({ trin: 8, count: 2, days: 90, teacherId: T1 }, now, dir);
    const b = await createClass({ trin: 9, count: 3, days: 30, teacherId: T1 }, after(1), dir);
    await createClass({ trin: 7, count: 1, days: 90, teacherId: T2 }, now, dir);
    await saveProgress(b.codes[0]!, { ...emptyFlow(), caseId: "sara" }, {}, after(1), dir);
    const list = await teacherClasses(T1, after(1), dir);
    expect(list.map((c) => c.id)).toEqual([b.id, a.id]);
    expect(list[0]).toMatchObject({ trin: 9, days: 30, codes: b.codes, started: 1, finished: 0, expires: after(31).toISOString() });
    // After 31 days b has expired: it is deleted and drops off the list.
    expect((await teacherClasses(T1, after(31), dir)).map((c) => c.id)).toEqual([a.id]);
    expect(await lookupCode(b.codes[0]!, after(1), dir)).toBeNull();
  });

  it("knows a class's codes, saves a pupil's work and shows it to the teacher", async () => {
    const cls = await createClass({ trin: 9, count: 3, days: 60, teacherId: T1 }, now, dir);
    const code = cls.codes[0]!;
    const other = ["BLÅ-ORM-10", "GUL-RÆV-11"].find((c) => !cls.codes.includes(c))!;
    expect(await lookupCode(code, now, dir)).toEqual({ flow: null, answers: {}, expires: after(60).toISOString() });
    expect(await lookupCode(other, now, dir)).toBeNull();
    expect(await lookupCode("not a code", now, dir)).toBeNull();

    const flow: Flow = { ...emptyFlow(), caseId: "sara", step: 8, maxStep: 8, done: true, bolig: 4800, mad: 2800, toj: 1500 };
    expect(await saveProgress(code, flow, { 2: "En tredjedel" }, now, dir)).toBe(true);
    expect(await saveProgress(other, flow, {}, now, dir)).toBe(false);
    expect(await lookupCode(code, now, dir)).toMatchObject({ flow, answers: { 2: "En tredjedel" } });

    const view = await classOverview(cls, dir);
    expect(view).toMatchObject({ id: cls.id, trin: 9, days: 60, codes: cls.codes, expires: after(60).toISOString() });
    expect(view.rows[0]).toEqual({ code, status: "Færdig", ok: true, caseName: "Sara" });
    expect(view.rows[1]?.status).toBe("Ikke startet");
    expect(view.stats).toMatchObject({ started: 1, finished: 1, finishedOk: 1, topCase: "Sara", topBolig: { label: "Delelejlighed", pct: 100 } });

    const pupil = await classPupil(cls, code, dir);
    expect(pupil?.answers[0]).toEqual({ q: "Hvor stor en del af lønnen gik til skat og AM-bidrag? Svar i kr. og i procent af lønnen før skat.", a: "En tredjedel" });
    expect(pupil?.choices.find((c) => c.label === "Bolig")?.value).toBe("Delelejlighed, 4.800 kr.");
    expect(await classPupil(cls, other, dir)).toBeNull();
  });

  it("ends a class after the days the teacher picked, and deleting removes its codes", async () => {
    const a = await createClass({ trin: 8, count: 2, days: 30, teacherId: T1 }, now, dir);
    const first = a.codes[0]!;
    expect(await lookupCode(first, after(29), dir)).not.toBeNull();
    expect(await lookupCode(first, after(30), dir)).toBeNull();
    expect(await readClassFor(T1, a.id, after(30), dir)).toBeNull();
    expect(await openStore(dir).get(codeKey(first))).toBeNull();

    const b = await createClass({ trin: 8, count: 2, days: 90, teacherId: T1 }, now, dir);
    await deleteClass(b, dir);
    expect(await lookupCode(b.codes[0]!, now, dir)).toBeNull();
    expect(await readClassFor(T1, b.id, now, dir)).toBeNull();
    expect(await teacherClasses(T1, now, dir)).toEqual([]);
  });

  it("sweeps old classes when a new one is made", async () => {
    const old = await createClass({ trin: 8, count: 2, days: 30, teacherId: T1 }, now, dir);
    await createClass({ trin: 8, count: 1, days: 90, teacherId: T2 }, after(31), dir);
    expect(await openStore(dir).get(`skole/klasser/${old.id}.json`)).toBeNull();
    expect(await openStore(dir).get(codeKey(old.codes[1]!))).toBeNull();
  });

  it("hands classes made before teacher logins to the teacher with the same e-mail", async () => {
    const store = openStore(dir);
    const h = emailHash("Laerer@Eksempel.dk");
    const legacy = (id: string, created: string) => ({ id, trin: 8, created, tokenHash: "x", emailHash: h, codes: [] });
    await store.set("skole/klasser/0000000001.json", JSON.stringify(legacy("0000000001", now.toISOString())));
    await store.set("skole/klasser/0000000002.json", JSON.stringify(legacy("0000000002", new Date(now.getTime() - 100 * DAY_MS).toISOString())));
    await store.set(`skole/laerere/${h}.json`, JSON.stringify({ classes: ["0000000001", "0000000002"] }));

    expect(await adoptLegacyClasses(T1, "anden@eksempel.dk", now, dir)).toBe(0);
    expect(await adoptLegacyClasses(T1, "laerer@eksempel.dk", now, dir)).toBe(1);
    const moved = await readClassFor(T1, "0000000001", now, dir);
    expect(moved).toMatchObject({ teacherId: T1, days: 90 });
    expect(moved).not.toHaveProperty("emailHash");
    expect((await teacherClasses(T1, now, dir)).map((c) => c.id)).toEqual(["0000000001"]);
    expect(await store.get(`skole/laerere/${h}.json`)).toBeNull();
  });

  it("spells æøå out in the storage key", () => {
    expect(codeKey("BLÅ-RÆV-47")).toBe("skole/koder/BLAA-RAEV-47.json");
    expect(codeKey("GRØN-ØRN-10")).toBe("skole/koder/GROEN-OERN-10.json");
  });
});
