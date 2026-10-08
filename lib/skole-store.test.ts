import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "./kv";
import { emptyFlow, isCode, type Flow } from "./skole";
import {
  classOverview, classPupil, codeKey, createClass, deleteClass, emailHash, lookupCode, newTeacherLinks, readClass, RELINK_GAP_MS, saveProgress,
} from "./skole-store";

const now = new Date("2026-10-08T08:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const after = (days: number) => new Date(now.getTime() + days * DAY_MS);
const EMAIL = "Laerer@Eksempel.dk";

describe("skole store", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-skole-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("makes a class with unique codes and a teacher link that opens it", async () => {
    const { token, cls } = await createClass({ trin: 8, count: 24, days: 90 }, now, dir);
    expect(cls.trin).toBe(8);
    expect(cls.codes).toHaveLength(24);
    expect(new Set(cls.codes).size).toBe(24);
    expect(cls.codes.every(isCode)).toBe(true);
    expect(token).toMatch(/^[0-9a-f]{10}\.[\w-]{24}$/);
    expect((await readClass(token, now, dir))?.id).toBe(cls.id);

    const secret = token.split(".")[1]!;
    const wrong = `${cls.id}.${secret.slice(0, -1)}${secret.endsWith("A") ? "B" : "A"}`;
    expect(await readClass(wrong, now, dir)).toBeNull();
    expect(await readClass("nonsense", now, dir)).toBeNull();
    expect(await openStore(dir).get(`skole/klasser/${cls.id}.json`)).not.toContain(secret);
  });

  it("refuses odd classes", async () => {
    await expect(createClass({ trin: 6, count: 10, days: 90 }, now, dir)).rejects.toThrow();
    await expect(createClass({ trin: 8, count: 0, days: 90 }, now, dir)).rejects.toThrow();
    await expect(createClass({ trin: 8, count: 41, days: 90 }, now, dir)).rejects.toThrow();
    await expect(createClass({ trin: 8, count: 10, days: 45 }, now, dir)).rejects.toThrow();
  });

  it("knows a class's codes, saves a pupil's work and shows it to the teacher", async () => {
    const { cls } = await createClass({ trin: 9, count: 3, days: 60 }, now, dir);
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
    expect(view).toMatchObject({ trin: 9, days: 60, expires: after(60).toISOString() });
    expect(view.rows[0]).toEqual({ code, status: "Færdig", ok: true, caseName: "Sara" });
    expect(view.rows[1]?.status).toBe("Ikke startet");
    expect(view.stats).toMatchObject({ started: 1, finished: 1, finishedOk: 1, topCase: "Sara", topBolig: { label: "Delelejlighed", pct: 100 } });

    const pupil = await classPupil(cls, code, dir);
    expect(pupil?.answers[0]).toEqual({ q: "Hvor stor en del af lønnen gik til skat?", a: "En tredjedel" });
    expect(pupil?.choices.find((c) => c.label === "Bolig")?.value).toBe("Delelejlighed, 4.800 kr.");
    expect(await classPupil(cls, other, dir)).toBeNull();
  });

  it("ends a class after the days the teacher picked, and deleting removes its codes", async () => {
    const a = await createClass({ trin: 8, count: 2, days: 30 }, now, dir);
    const first = a.cls.codes[0]!;
    expect(await lookupCode(first, after(29), dir)).not.toBeNull();
    expect(await lookupCode(first, after(30), dir)).toBeNull();
    expect(await readClass(a.token, after(30), dir)).toBeNull();
    expect(await openStore(dir).get(codeKey(first))).toBeNull();

    const b = await createClass({ trin: 8, count: 2, days: 90 }, now, dir);
    await deleteClass(b.cls, dir);
    expect(await lookupCode(b.cls.codes[0]!, now, dir)).toBeNull();
    expect(await readClass(b.token, now, dir)).toBeNull();
  });

  it("sweeps old classes when a new one is made", async () => {
    const old = await createClass({ trin: 8, count: 2, days: 30 }, now, dir);
    await createClass({ trin: 8, count: 1, days: 90 }, after(31), dir);
    expect(await openStore(dir).get(`skole/klasser/${old.cls.id}.json`)).toBeNull();
    expect(await openStore(dir).get(codeKey(old.cls.codes[1]!))).toBeNull();
  });

  it("keeps the teacher's e-mail only as a hash, and mails new links that replace the old ones", async () => {
    const a = await createClass({ trin: 8, count: 2, days: 90, email: EMAIL }, now, dir);
    const b = await createClass({ trin: 9, count: 2, days: 30, email: "laerer@eksempel.dk " }, now, dir);
    await createClass({ trin: 7, count: 1, days: 90, email: "anden@eksempel.dk" }, now, dir);
    const raw = await openStore(dir).get(`skole/klasser/${a.cls.id}.json`);
    expect(raw).not.toMatch(/eksempel/i);
    expect(a.cls.emailHash).toBe(emailHash("laerer@eksempel.dk"));

    expect(await newTeacherLinks("ukendt@eksempel.dk", now, dir)).toEqual([]);
    const links = await newTeacherLinks(EMAIL, now, dir);
    if (links === "throttled") throw new Error("throttled");
    expect(links.map((l) => l.cls.trin).sort()).toEqual([8, 9]);
    expect(await readClass(a.token, now, dir)).toBeNull();
    expect((await readClass(links.find((l) => l.cls.id === a.cls.id)!.token, now, dir))?.id).toBe(a.cls.id);

    expect(await newTeacherLinks(EMAIL, new Date(now.getTime() + 1000), dir)).toBe("throttled");
    // After b has expired and a is deleted, the next mail has nothing left to send.
    await deleteClass(a.cls, dir);
    expect(await newTeacherLinks(EMAIL, after(31), dir)).toEqual([]);
    expect(await newTeacherLinks(EMAIL, new Date(after(31).getTime() + RELINK_GAP_MS), dir)).toEqual([]);
    expect(b.cls.days).toBe(30);
  });

  it("spells æøå out in the storage key", () => {
    expect(codeKey("BLÅ-RÆV-47")).toBe("skole/koder/BLAA-RAEV-47.json");
    expect(codeKey("GRØN-ØRN-10")).toBe("skole/koder/GROEN-OERN-10.json");
  });
});
