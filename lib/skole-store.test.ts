import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "./kv";
import { CLASS_DAYS, emptyFlow, isCode, type Flow } from "./skole";
import { classOverview, codeKey, createClass, deleteClass, lookupCode, readClass, saveFlow } from "./skole-store";

const now = new Date("2026-10-08T08:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const later = new Date(now.getTime() + (CLASS_DAYS + 1) * DAY_MS);

describe("skole store", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-skole-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("makes a class with unique codes and a teacher link that opens it", async () => {
    const { token, cls } = await createClass(8, 24, now, dir);
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
    await expect(createClass(6, 10, now, dir)).rejects.toThrow();
    await expect(createClass(8, 0, now, dir)).rejects.toThrow();
    await expect(createClass(8, 41, now, dir)).rejects.toThrow();
  });

  it("knows a class's codes, saves a pupil's choices and shows them to the teacher", async () => {
    const { cls } = await createClass(9, 3, now, dir);
    const code = cls.codes[0]!;
    const other = ["BLÅ-ORM-10", "GUL-RÆV-11"].find((c) => !cls.codes.includes(c))!;
    expect(await lookupCode(code, now, dir)).toEqual({ flow: null });
    expect(await lookupCode(other, now, dir)).toBeNull();
    expect(await lookupCode("not a code", now, dir)).toBeNull();

    const flow: Flow = { ...emptyFlow(), caseId: "sara", step: 8, maxStep: 8, done: true, bolig: 4800, mad: 2800, toj: 1500 };
    expect(await saveFlow(code, flow, now, dir)).toBe(true);
    expect(await saveFlow(other, flow, now, dir)).toBe(false);
    expect((await lookupCode(code, now, dir))?.flow).toEqual(flow);

    const view = await classOverview(cls, dir);
    expect(view.trin).toBe(9);
    expect(view.expires).toBe(new Date(now.getTime() + CLASS_DAYS * DAY_MS).toISOString());
    expect(view.rows[0]).toEqual({ code, status: "Færdig", ok: true, caseName: "Sara" });
    expect(view.rows[1]?.status).toBe("Ikke startet");
    expect(view.stats).toMatchObject({ started: 1, finished: 1, finishedOk: 1, topCase: "Sara", topBolig: { label: "Delelejlighed", pct: 100 } });
  });

  it("forgets a class after CLASS_DAYS, and deleting removes its codes", async () => {
    const a = await createClass(8, 2, now, dir);
    const first = a.cls.codes[0]!;
    expect(await lookupCode(first, later, dir)).toBeNull();
    expect(await readClass(a.token, later, dir)).toBeNull();
    expect(await openStore(dir).get(codeKey(first))).toBeNull();

    const b = await createClass(8, 2, now, dir);
    await deleteClass(b.cls, dir);
    expect(await lookupCode(b.cls.codes[0]!, now, dir)).toBeNull();
    expect(await readClass(b.token, now, dir)).toBeNull();
  });

  it("sweeps old classes when a new one is made", async () => {
    const old = await createClass(8, 2, now, dir);
    await createClass(8, 1, later, dir);
    expect(await openStore(dir).get(`skole/klasser/${old.cls.id}.json`)).toBeNull();
    expect(await openStore(dir).get(codeKey(old.cls.codes[1]!))).toBeNull();
  });

  it("spells æøå out in the storage key", () => {
    expect(codeKey("BLÅ-RÆV-47")).toBe("skole/koder/BLAA-RAEV-47.json");
    expect(codeKey("GRØN-ØRN-10")).toBe("skole/koder/GROEN-OERN-10.json");
  });
});
