# budgetpro Skole 2/3 – Classes, codes and saving Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher makes a class at `/skole/laerer` (grade + number of pupils) and gets pupil codes plus a secret teacher link; pupils can only start with a real code, their choices are saved per code so they can continue on another computer, and the teacher link opens a live class overview (`/skole/klasse/<token>`) that can also delete the class.

**Architecture:** The rules and the overview numbers go into the shared `lib/skole.ts` (`sanitizeFlow`, `pupilRow`, `classStats`). Storage goes into a new `lib/skole-store.ts` on top of the existing `lib/kv.ts` (disk in `data/` locally, Upstash Redis on Vercel), with three small route handlers under `app/api/skole/`. No names are stored anywhere: a pupil is only a code, and the reflection answers (free text) stay in the pupil's browser. The teacher link is `<class id>.<secret>`; only a SHA-256 hash of the secret is stored (same idea as the login links in `lib/accounts.ts`). A class and its codes are forgotten 90 days after it was made.

**Tech Stack:** Next.js 16 route handlers (`RouteContext<…>` / `PageProps<…>` are global types made by `next typegen`), `node:crypto`, Vitest with a temp data dir.

**Depends on:** plan 1 (`2026-10-08-skole-1-elevforloeb.md`) is done.

---

## Ground rules (read first)

- Code and comments in English; all UI text in Danish, du-form, calm, no exclamation marks, no sales words. Copy the Danish strings exactly.
- Edit files with the Write/Edit tools only (never PowerShell `Get-Content`/`Set-Content`).
- Never delete or hand-edit `data/` (real budgets live there). Tests use a temp dir; the store helpers take an optional `dir` for that.
- Commit as KBJ1983; end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Storage layout

```
skole/klasser/<id>.json   { id, trin, created, tokenHash, codes: string[] }
skole/koder/<key>.json    { code, classId, created, flow?, updated? }      key = code with Æ→AE, Ø→OE, Å→AA
```

Codes are reserved with the store's `add` (write-if-new), so two classes never get the same code.

## File structure

| File | Responsibility |
|---|---|
| `lib/skole.ts` (modify) | `TRIN`, `MAX_PUPILS`, `CLASS_DAYS`, `sanitizeFlow`, `pupilRow`, `classStats`, `ClassView` |
| `lib/skole-store.ts` (new) | Make/read/delete classes, look up a code, save a pupil's flow, build the overview, sweep old classes |
| `lib/skole-store.test.ts` (new) | Store tests in a temp dir |
| `app/api/skole/klasse/route.ts` (new) | `POST` make a class |
| `app/api/skole/klasse/[token]/route.ts` (new) | `GET` overview, `DELETE` class |
| `app/api/skole/elev/route.ts` (new) | `POST` look up a code, `PUT` save a flow |
| `components/skole/StudentApp.tsx` (modify) | Check the code on the server, resume, save as the pupil goes |
| `components/skole/TeacherCreate.tsx` (new) | Make a class, show link + codes, copy, print |
| `components/skole/ClassOverview.tsx` (new) | Live overview with stats and table, delete |
| `components/skole/skole.module.css` (modify) | Teacher styles + print layout for the codes |
| `app/skole/laerer/page.tsx`, `app/skole/klasse/[token]/page.tsx` (new) | Routes |

---

### Task 1: Rules for saved flows and the overview numbers

**Files:**
- Modify: `lib/skole.ts` (append)
- Test: `lib/skole.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Add `classStats, pupilRow, sanitizeFlow` to the import line of `lib/skole.test.ts`, then append:

```ts
describe("saved flows", () => {
  it("keeps a valid flow as it is", () => {
    const f = sara({ cFaste: [{ name: "Fitness", amt: 250 }], scen: { rent: true }, posts: seedPosts(sara()) });
    expect(sanitizeFlow(JSON.parse(JSON.stringify(f)))).toEqual(f);
    expect(sanitizeFlow(emptyFlow())).toEqual(emptyFlow());
  });

  it("rejects what is not a flow", () => {
    expect(sanitizeFlow(null)).toBeNull();
    expect(sanitizeFlow("x")).toBeNull();
    expect(sanitizeFlow({ ...emptyFlow(), step: 9 })).toBeNull();
    expect(sanitizeFlow({ ...emptyFlow(), step: 3, maxStep: 2 })).toBeNull();
  });

  it("drops values that are not one of the choices", () => {
    const f = sanitizeFlow({ ...sara(), caseId: "bob", bolig: 1234, mad: 99, buffer: 5000, months: 1, scen: { rent: true, hack: true }, faste: { mobil: "ja" } });
    expect(f).toMatchObject({ caseId: null, bolig: null, mad: null, buffer: 500, months: 12, scen: { rent: true } });
    expect(f?.faste).toEqual({ forsikring: false, mobil: false, internet: false, transport: false, fag: false, stream: false });
  });

  it("trims own lines and posts", () => {
    const f = sanitizeFlow({
      ...sara(),
      cOps: [{ name: "  Ferie  ", amt: 300 }, { name: "", amt: 10 }, { name: "x".repeat(60), amt: -5 }, ...Array(20).fill({ name: "Gave", amt: 100 })],
      posts: [{ id: "a", cat: "ops", name: "Ferie", amt: 300, freq: "md" }, { id: "b", cat: "nope", name: "X", amt: 1, freq: "md" }],
    });
    expect(f?.cOps[0]).toEqual({ name: "Ferie", amt: 300 });
    expect(f?.cOps[1]).toEqual({ name: "x".repeat(40), amt: 0 });
    expect(f?.cOps).toHaveLength(10);
    expect(f?.posts).toEqual([{ id: "a", cat: "ops", name: "Ferie", amt: 300, freq: "md" }]);
  });
});

describe("class overview", () => {
  const done = (patch: Partial<Flow>) => sara({ step: 8, maxStep: 8, done: true, ...patch });

  it("shows each pupil's progress without names", () => {
    expect(pupilRow("BLÅ-ORM-47", null)).toEqual({ code: "BLÅ-ORM-47", status: "Ikke startet", ok: null, caseName: null });
    expect(pupilRow("BLÅ-ORM-47", sara({ step: 4, maxStep: 5 }))).toEqual({ code: "BLÅ-ORM-47", status: "Trin 5", ok: null, caseName: "Sara" });
    expect(pupilRow("BLÅ-ORM-47", done({}))).toEqual({ code: "BLÅ-ORM-47", status: "Færdig", ok: true, caseName: "Sara" });
  });

  it("sums up the class", () => {
    const flows = [done({}), done({ caseId: "mira", bolig: 6900 }), done({ bolig: 3500 }), sara({ caseId: "jonas", step: 3, maxStep: 3 }), null];
    expect(classStats(flows)).toEqual({ started: 4, finished: 3, finishedOk: 2, topCase: "Sara", topBolig: { label: "Delelejlighed", pct: 50 } });
    expect(classStats([null, null])).toEqual({ started: 0, finished: 0, finishedOk: 0, topCase: null, topBolig: null });
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm test lib/skole.test.ts`
Expected: FAIL – `sanitizeFlow is not a function`.

- [ ] **Step 3: Append to `lib/skole.ts`**

```ts
// ---- Classes -----------------------------------------------------------------------------------------------------

/** Grades a class can be made for. */
export const TRIN: readonly number[] = [7, 8, 9];
export const MAX_PUPILS = 40;
/** A class, its codes and the pupils' choices are deleted this many days after the class was made. */
export const CLASS_DAYS = 90;

const isNum = (x: unknown, lo: number, hi: number): x is number => typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;
const isInt = (x: unknown, lo: number, hi: number): x is number => Number.isInteger(x) && isNum(x, lo, hi);
const text = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const pick = <T,>(x: unknown, allowed: readonly T[]): T | null => (allowed.includes(x as T) ? (x as T) : null);
const field = (o: unknown, k: string): unknown => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined);

function ownLines(x: unknown): Own[] {
  if (!Array.isArray(x)) return [];
  return x
    .map((o) => ({ name: text(field(o, "name"), 40), amt: isNum(field(o, "amt"), 0, 100000) ? Math.round(field(o, "amt") as number) : 0 }))
    .filter((o) => o.name)
    .slice(0, MAX_OWN);
}

function postLines(x: unknown): Post[] | null {
  if (!Array.isArray(x)) return null;
  return x.slice(0, MAX_POSTS).flatMap((p): Post[] => {
    const cat = pick(field(p, "cat"), CATS.map((c) => c.key));
    const freq = pick(field(p, "freq"), Object.keys(FREQS) as Freq[]);
    const id = text(field(p, "id"), 24);
    const amt = field(p, "amt");
    return cat && freq && id && isNum(amt, 0, 1_000_000) ? [{ id, cat, freq, name: text(field(p, "name"), 40), amt }] : [];
  });
}

/** A flow sent by the browser, checked: only known choices, short texts, bounded numbers. null if it isn't one. */
export function sanitizeFlow(x: unknown): Flow | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (!isInt(o.step, 1, STEP_COUNT) || !isInt(o.maxStep, o.step, STEP_COUNT)) return null;
  const e = emptyFlow();
  return {
    caseId: pick(o.caseId, CASES.map((c) => c.id)),
    step: o.step,
    maxStep: o.maxStep,
    done: o.done === true,
    bolig: pick(o.bolig, BOLIG.map((b) => b.amt)),
    faste: Object.fromEntries(FASTE.map((f) => [f.key, field(o.faste, f.key) === true])) as Record<FasteKey, boolean>,
    cFaste: ownLines(o.cFaste),
    mad: pick(o.mad, HVERDAG[0].vals),
    toj: pick(o.toj, HVERDAG[1].vals),
    buffer: isInt(o.buffer, 0, BUFFER_MAX) && o.buffer % 100 === 0 ? o.buffer : e.buffer,
    months: isInt(o.months, MONTHS_MIN, MONTHS_MAX) ? o.months : e.months,
    cOps: ownLines(o.cOps),
    scen: Object.fromEntries(SCEN_KEYS.filter((k) => field(o.scen, k) === true).map((k) => [k, true])),
    posts: postLines(o.posts),
  };
}

/** One line of the teacher's table. */
export interface PupilRow {
  code: string;
  /** "Ikke startet", "Trin 5" or "Færdig". */
  status: string;
  ok: boolean | null;
  caseName: string | null;
}

export function pupilRow(code: string, f: Flow | null): PupilRow {
  if (!f) return { code, status: "Ikke startet", ok: null, caseName: null };
  return { code, status: f.done ? "Færdig" : `Trin ${f.maxStep}`, ok: isOk(f), caseName: f.caseId ? caseById(f.caseId).name : null };
}

export interface ClassStats {
  started: number;
  finished: number;
  /** Finished pupils whose budget adds up. */
  finishedOk: number;
  topCase: string | null;
  /** The most chosen home, and its share of the pupils who chose one. */
  topBolig: { label: string; pct: number } | null;
}

function mostCommon<T>(xs: T[]): [T, number] | null {
  const counts = new Map<T, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best: [T, number] | null = null;
  for (const e of counts) if (!best || e[1] > best[1]) best = e;
  return best;
}

export function classStats(flows: (Flow | null)[]): ClassStats {
  const started = flows.filter((f): f is Flow => !!f);
  const finished = started.filter((f) => f.done);
  const cases = started.map((f) => f.caseId).filter((c): c is CaseId => !!c);
  const homes = started.map((f) => f.bolig).filter((b): b is number => b != null);
  const topCase = mostCommon(cases);
  const topHome = mostCommon(homes);
  return {
    started: started.length,
    finished: finished.length,
    finishedOk: finished.filter((f) => isOk(f) === true).length,
    topCase: topCase ? caseById(topCase[0]).name : null,
    topBolig: topHome ? { label: BOLIG.find((b) => b.amt === topHome[0])?.label ?? "", pct: Math.round((topHome[1] / homes.length) * 100) } : null,
  };
}

/** What the teacher's overview shows (lib/skole-store.ts builds it). */
export interface ClassView {
  trin: number;
  created: string;
  expires: string;
  rows: PupilRow[];
  stats: ClassStats;
}
```

Note: in `classStats` ties go to the first one found (Map keeps insertion order), (Sara is 2 of the 4 cases; Delelejlighed is 2 of the 4 homes → 50 %; Miras budget with a 1-værelses doesn't add up, so 2 of the 3 finished are ok).

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm test lib/skole.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/skole.ts lib/skole.test.ts
git commit -m "Skole: check saved flows, pupil rows and class numbers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `lib/skole-store.ts`

**Files:**
- Create: `lib/skole-store.ts`
- Test: `lib/skole-store.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "./kv";
import { CLASS_DAYS, emptyFlow, isCode, type Flow } from "./skole";
import { classOverview, codeKey, createClass, deleteClass, lookupCode, readClass, saveFlow } from "./skole-store";

const now = new Date("2026-10-08T08:00:00Z");
const later = new Date(now.getTime() + (CLASS_DAYS + 1) * 24 * 60 * 60 * 1000);

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

    const secret = token.split(".")[1];
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
    const code = cls.codes[0];
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
    expect(view.expires).toBe(new Date(now.getTime() + CLASS_DAYS * 24 * 60 * 60 * 1000).toISOString());
    expect(view.rows[0]).toEqual({ code, status: "Færdig", ok: true, caseName: "Sara" });
    expect(view.rows[1].status).toBe("Ikke startet");
    expect(view.stats).toMatchObject({ started: 1, finished: 1, finishedOk: 1, topCase: "Sara", topBolig: { label: "Delelejlighed", pct: 100 } });
  });

  it("forgets a class after CLASS_DAYS, and deleting removes its codes", async () => {
    const a = await createClass(8, 2, now, dir);
    expect(await lookupCode(a.cls.codes[0], later, dir)).toBeNull();
    expect(await readClass(a.token, later, dir)).toBeNull();
    expect(await openStore(dir).get(codeKey(a.cls.codes[0]))).toBeNull();

    const b = await createClass(8, 2, now, dir);
    await deleteClass(b.cls, dir);
    expect(await lookupCode(b.cls.codes[0], now, dir)).toBeNull();
    expect(await readClass(b.token, now, dir)).toBeNull();
  });

  it("sweeps old classes when a new one is made", async () => {
    const old = await createClass(8, 2, now, dir);
    await createClass(8, 1, later, dir);
    expect(await openStore(dir).get(`skole/klasser/${old.cls.id}.json`)).toBeNull();
    expect(await openStore(dir).get(codeKey(old.cls.codes[1]))).toBeNull();
  });

  it("spells æøå out in the storage key", () => {
    expect(codeKey("BLÅ-RÆV-47")).toBe("skole/koder/BLAA-RAEV-47.json");
    expect(codeKey("GRØN-ØRN-10")).toBe("skole/koder/GROEN-OERN-10.json");
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm test lib/skole-store.test.ts`
Expected: FAIL – `Failed to resolve import "./skole-store"`.

- [ ] **Step 3: Write `lib/skole-store.ts`**

```ts
/**
 * budgetpro Skole's classes (the flow and its numbers are in lib/skole.ts), in the store (lib/kv.ts):
 *
 *   skole/klasser/<id>.json   { id, trin, created, tokenHash, codes }
 *   skole/koder/<key>.json    { code, classId, created, flow?, updated? }   key = the code with Æ/Ø/Å spelled out
 *
 * No names: a pupil is only a code, and the reflection answers stay in the pupil's browser. The teacher's link holds
 * "<id>.<secret>"; only a hash of the secret is stored. Codes are reserved with add(), so no two classes share one.
 * A class and its codes are forgotten CLASS_DAYS after it was made: reading them later deletes them, and making a
 * new class sweeps the expired ones.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { openStore } from "./kv";
import { CLASS_DAYS, classStats, isCode, MAX_PUPILS, pupilRow, randomCode, TRIN, type ClassView, type Flow } from "./skole";

export interface SchoolClass {
  id: string;
  trin: number;
  created: string;
  tokenHash: string;
  codes: string[];
}

interface CodeRecord {
  code: string;
  classId: string;
  created: string;
  flow?: Flow;
  updated?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CLASSES = "skole/klasser";
const classKey = (id: string) => `${CLASSES}/${id}.json`;
export const codeKey = (code: string) => `skole/koder/${code.replace(/Æ/g, "AE").replace(/Ø/g, "OE").replace(/Å/g, "AA")}.json`;
const hash = (secret: string) => createHash("sha256").update(secret).digest("hex");
const expiresAt = (created: string) => new Date(Date.parse(created) + CLASS_DAYS * DAY_MS);
/** Also true for a broken date, so a bad record goes away. */
const expired = (created: string, now: Date) => !(now < expiresAt(created));

function parse<T>(text: string | null): T | null {
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

/** Makes a class with `count` new codes. Returns the teacher's link token – the only time it exists in full. */
export async function createClass(trin: number, count: number, now = new Date(), dir?: string): Promise<{ token: string; cls: SchoolClass }> {
  if (!TRIN.includes(trin) || !Number.isInteger(count) || count < 1 || count > MAX_PUPILS) throw new Error("Invalid class");
  const store = openStore(dir);
  await sweep(now, dir);
  const id = randomBytes(5).toString("hex");
  const secret = randomBytes(18).toString("base64url");
  const created = now.toISOString();
  const codes: string[] = [];
  for (let tries = 0; codes.length < count; tries++) {
    if (tries > count * 50) throw new Error("No free pupil codes");
    const code = randomCode(() => randomInt(0, 2 ** 32) / 2 ** 32);
    const record: CodeRecord = { code, classId: id, created };
    if (await store.add(codeKey(code), JSON.stringify(record))) codes.push(code);
  }
  const cls: SchoolClass = { id, trin, created, tokenHash: hash(secret), codes };
  await store.set(classKey(id), JSON.stringify(cls));
  return { token: `${id}.${secret}`, cls };
}

/** The class behind a teacher link, or null (unknown, wrong secret or expired). */
export async function readClass(token: string, now = new Date(), dir?: string): Promise<SchoolClass | null> {
  const m = /^([0-9a-f]{10})\.([\w-]{24})$/.exec(token);
  if (!m) return null;
  const cls = parse<SchoolClass>(await openStore(dir).get(classKey(m[1])));
  if (!cls) return null;
  const a = Buffer.from(hash(m[2]));
  const b = Buffer.from(String(cls.tokenHash ?? ""));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (expired(cls.created, now)) {
    await deleteClass(cls, dir);
    return null;
  }
  return cls;
}

/** Deletes a class with its codes and the pupils' choices. */
export async function deleteClass(cls: SchoolClass, dir?: string): Promise<void> {
  const store = openStore(dir);
  await Promise.all(cls.codes.map((c) => store.del(codeKey(c))));
  await store.del(classKey(cls.id));
}

async function readCode(code: string, now: Date, dir?: string): Promise<CodeRecord | null> {
  if (!isCode(code)) return null;
  const r = parse<CodeRecord>(await openStore(dir).get(codeKey(code)));
  return r && r.code === code && !expired(r.created, now) ? r : null;
}

/** A pupil's code: null when unknown; otherwise the saved choices (null before the first save). */
export async function lookupCode(code: string, now = new Date(), dir?: string): Promise<{ flow: Flow | null } | null> {
  const r = await readCode(code, now, dir);
  return r ? { flow: r.flow ?? null } : null;
}

/** Saves a pupil's choices (already checked with sanitizeFlow). False for an unknown code. */
export async function saveFlow(code: string, flow: Flow, now = new Date(), dir?: string): Promise<boolean> {
  const r = await readCode(code, now, dir);
  if (!r) return false;
  const next: CodeRecord = { ...r, flow, updated: now.toISOString() };
  await openStore(dir).set(codeKey(code), JSON.stringify(next));
  return true;
}

export async function classOverview(cls: SchoolClass, dir?: string): Promise<ClassView> {
  const store = openStore(dir);
  const flows = await Promise.all(
    cls.codes.map(async (c) => {
      const r = parse<CodeRecord>(await store.get(codeKey(c)));
      return r?.classId === cls.id ? (r.flow ?? null) : null;
    }),
  );
  return {
    trin: cls.trin,
    created: cls.created,
    expires: expiresAt(cls.created).toISOString(),
    rows: cls.codes.map((c, i) => pupilRow(c, flows[i])),
    stats: classStats(flows),
  };
}

async function sweep(now: Date, dir?: string): Promise<void> {
  const store = openStore(dir);
  const names = (await store.list(CLASSES)).filter((n) => n.endsWith(".json"));
  for (const n of names) {
    const cls = parse<SchoolClass>(await store.get(`${CLASSES}/${n}`));
    if (cls && expired(cls.created, now)) await deleteClass(cls, dir);
  }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm test lib/skole-store.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/skole-store.ts lib/skole-store.test.ts
git commit -m "Skole: classes, pupil codes and saved choices in the store" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Route handlers

**Files:**
- Create: `app/api/skole/klasse/route.ts`, `app/api/skole/klasse/[token]/route.ts`, `app/api/skole/elev/route.ts`

- [ ] **Step 1: Create `app/api/skole/klasse/route.ts`**

```ts
import { MAX_PUPILS, TRIN } from "@/lib/skole";
import { createClass } from "@/lib/skole-store";

// budgetpro Skole: a teacher makes a class (no login). Returns the teacher link's token and the pupil codes; the
// token is shown only this once (only a hash of it is kept).
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const trin = Number(b.trin);
  const antal = Number(b.antal);
  if (!TRIN.includes(trin) || !Number.isInteger(antal) || antal < 1 || antal > MAX_PUPILS) {
    return Response.json({ error: "input" }, { status: 400 });
  }
  const { token, cls } = await createClass(trin, antal);
  return Response.json({ token, trin: cls.trin, codes: cls.codes }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 2: Create `app/api/skole/klasse/[token]/route.ts`**

```ts
import { classOverview, deleteClass, readClass } from "@/lib/skole-store";

// The teacher's class (budgetpro Skole): GET the overview, DELETE the class with its codes and the pupils' choices.
const noStore = { "Cache-Control": "no-store" };

export async function GET(_req: Request, ctx: RouteContext<"/api/skole/klasse/[token]">) {
  const cls = await readClass((await ctx.params).token);
  if (!cls) return new Response(null, { status: 404, headers: noStore });
  return Response.json(await classOverview(cls), { headers: noStore });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/skole/klasse/[token]">) {
  const cls = await readClass((await ctx.params).token);
  if (!cls) return new Response(null, { status: 404, headers: noStore });
  await deleteClass(cls);
  return new Response(null, { status: 204, headers: noStore });
}
```

- [ ] **Step 3: Create `app/api/skole/elev/route.ts`**

The code travels in the body (not the URL) so æøå need no escaping.

```ts
import { isCode, normalizeCode, sanitizeFlow } from "@/lib/skole";
import { lookupCode, saveFlow } from "@/lib/skole-store";

// A pupil's code (budgetpro Skole). POST { code } → { code, flow } (flow is null before the first save), 404 for an
// unknown code. PUT { code, flow } saves the choices, checked by sanitizeFlow. Reflection answers never come here.
const noStore = { "Cache-Control": "no-store" };
const MAX_BODY = 32_000;

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  try {
    const x = JSON.parse(text);
    return x && typeof x === "object" ? x : null;
  } catch {
    return null;
  }
}

const codeOf = (b: Record<string, unknown> | null) => (typeof b?.code === "string" ? normalizeCode(b.code) : "");

export async function POST(req: Request) {
  const code = codeOf(await readBody(req));
  const found = isCode(code) ? await lookupCode(code) : null;
  if (!found) return new Response(null, { status: 404, headers: noStore });
  return Response.json({ code, flow: found.flow }, { headers: noStore });
}

export async function PUT(req: Request) {
  const b = await readBody(req);
  const code = codeOf(b);
  const flow = sanitizeFlow(b?.flow);
  if (!isCode(code) || !flow) return new Response(null, { status: 400, headers: noStore });
  return new Response(null, { status: (await saveFlow(code, flow)) ? 204 : 404, headers: noStore });
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors (`next typegen` creates the `RouteContext` type for the new route).

- [ ] **Step 5: Try the routes by hand**

With `pnpm dev` running, in Git Bash:

```bash
curl -s -X POST localhost:3200/api/skole/klasse -H 'Content-Type: application/json' -d '{"trin":8,"antal":2}'
# → {"token":"<10 hex>.<24 chars>","trin":8,"codes":["…","…"]}
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3200/api/skole/elev -d '{"code":"BLÅ-ORM-10"}'
# → 404 (unless that exact code was just made)
curl -s -X GET localhost:3200/api/skole/klasse/<token>
# → {"trin":8,…,"rows":[{"code":"…","status":"Ikke startet",…}],…}
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE localhost:3200/api/skole/klasse/<token>
# → 204
```

- [ ] **Step 6: Commit**

```bash
git add app/api/skole
git commit -m "Skole: routes to make a class, read or delete it, and look up or save a pupil code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Pupils start with a real code and their choices are saved

**Files:**
- Modify: `components/skole/StudentApp.tsx`

- [ ] **Step 1: Replace `begin` and add saving**

In `components/skole/StudentApp.tsx`:

1. Add `busy` state next to the others:

```tsx
  const [busy, setBusy] = useState(false);
```

2. Replace the whole `begin` function with:

```tsx
  const begin = async () => {
    const c = normalizeCode(code);
    if (!isCode(c)) return setCodeErr("Skriv den kode, du har fået af din lærer.");
    if (c === opened) return setScreen(flow.done ? "sum" : "flow");
    setBusy(true);
    try {
      const r = await fetch("/api/skole/elev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c }) });
      if (r.status === 404) return setCodeErr("Den kode kender vi ikke. Tjek, at den er skrevet rigtigt, eller spørg din lærer.");
      if (!r.ok) throw new Error(String(r.status));
      const saved = (await r.json()) as { flow: Flow | null };
      open(c, saved.flow ?? emptyFlow());
    } catch {
      setCodeErr("Der er ingen forbindelse lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };
```

3. Below the scroll effect, add the autosave (it also runs once right after the code is opened, which marks the pupil as started in the teacher's table):

```tsx
  // Save the choices a moment after each change. keepalive lets the last save finish if the tab closes.
  useEffect(() => {
    if (!opened) return;
    const timer = setTimeout(() => {
      fetch("/api/skole/elev", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: opened, flow }), keepalive: true }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [opened, flow]);
```

4. Pass the real busy flag to `Start`: change `busy={false}` to `busy={busy}`, and change `onStart={begin}` to `onStart={() => void begin()}`.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Check by hand**

With `pnpm dev`: make a class with curl (Task 3 Step 5), then on `http://localhost:3200/skole`:
1. `BLÅ-ORM-09` → "Skriv den kode, du har fået af din lærer."; a well-formed unknown code → "Den kode kender vi ikke. …".
2. One of the new codes (typed in lower case) → step 1. Choose Sara, go to step 3.
3. Open a private window, enter the same code → it continues at step 3 with Sara chosen.
4. `data/skole/koder/<code>.json` now holds `"flow"` – and no reflection text.

- [ ] **Step 4: Commit**

```bash
git add components/skole/StudentApp.tsx
git commit -m "Skole: pupils start with a class code, choices are saved and can be continued" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Teacher pages

**Files:**
- Modify: `components/skole/skole.module.css` (append before the `@media (prefers-reduced-motion…` block)
- Create: `components/skole/TeacherCreate.tsx`, `components/skole/ClassOverview.tsx`, `app/skole/laerer/page.tsx`, `app/skole/klasse/[token]/page.tsx`

- [ ] **Step 1: Append the teacher styles to `components/skole/skole.module.css`**

Insert this block just above `@media (prefers-reduced-motion: reduce)`:

```css
/* Teacher */
.createRow { flex-direction: row; flex-wrap: wrap; align-items: flex-end; gap: 24px; padding: 22px; }
.trinRow { display: flex; gap: 6px; }
.trinBtn { width: 64px; height: 48px; border: 2px solid var(--rule); background: #fff; color: var(--ink); border-radius: 12px; font-weight: 700; font-size: 18px; cursor: pointer; }
.trinBtn[aria-pressed="true"] { border-color: var(--pine); background: var(--pine); color: #fff; }
.stepper { display: flex; align-items: center; border: 1px solid var(--rule); border-radius: 12px; height: 48px; overflow: hidden; }
.stepper button { width: 48px; height: 48px; border: 0; background: var(--paper); font-weight: 600; font-size: 22px; cursor: pointer; color: var(--ink); }
.stepper span { width: 64px; text-align: center; font-weight: 700; font-size: 19px; }
.info { margin: 0; font-weight: 500; font-size: 17px; line-height: 1.5; color: var(--pine); background: var(--pine-bg); border-radius: 12px; padding: 12px 16px; }
.warn { margin: 0; font-weight: 500; font-size: 16px; line-height: 1.5; color: var(--gold-ink-2); background: var(--gold-bg); border-radius: 12px; padding: 12px 16px; }
.linkBox { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.linkBox .input { flex: 1 1 260px; }
.codesHead { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.codesHead .h2 { margin-right: auto; }
.codes { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.codeCell { background: #fff; border: 1px solid var(--rule); border-radius: 10px; padding: 10px 12px; display: flex; gap: 10px; align-items: baseline; }
.codeNo { font-weight: 500; font-size: 13px; color: var(--ink-2); width: 20px; }
.codeText { font-weight: 600; font-size: 16px; letter-spacing: 0.04em; }
.titleRow { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 16px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.stat { border-radius: 16px; padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; background: #fff; color: var(--ink); border: 1px solid var(--rule); }
.stat:nth-child(1) { background: var(--pine); border-color: var(--pine); color: #fff; }
.stat:nth-child(3) { background: var(--gold-bg); border-color: var(--gold-bg); color: var(--gold-ink-2); }
.stat b { font-weight: 700; font-size: 44px; line-height: 1; letter-spacing: -0.03em; }
.stat span { font-weight: 500; font-size: 17px; line-height: 1.35; }
.table { background: #fff; border: 1px solid var(--rule); border-radius: 16px; overflow: hidden; }
.tr { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; border-top: 1px solid var(--rule-2); font-size: 16px; }
.tr > span { padding: 11px 18px; overflow-wrap: anywhere; }
.tr > span:first-child { font-weight: 600; letter-spacing: 0.04em; }
.th { background: var(--ink); color: var(--paper); font-weight: 600; font-size: 15px; border-top: 0; }
.th > span:first-child { letter-spacing: 0; }
.ok { font-weight: 700; color: var(--pine); }
.notOk { font-weight: 700; color: var(--red); }
```

Then, inside the existing `@media (max-width: 760px)` block, add:

```css
  .tr { grid-template-columns: 1.4fr 1fr 0.8fr 0.9fr; font-size: 14px; }
  .tr > span { padding: 10px 8px; }
  .stat b { font-size: 36px; }
  .createRow { gap: 16px; }
```

And inside the existing `@media print` block, add:

```css
  .codes { grid-template-columns: repeat(3, 1fr); gap: 0; }
  .codeCell { border: 1px dashed #999; border-radius: 0; padding: 18px 14px; break-inside: avoid; }
  .codeText { font-size: 20px; }
  .wrap { padding: 0; }
```

- [ ] **Step 2: Create `components/skole/TeacherCreate.tsx`**

```tsx
"use client";

import { useState } from "react";
import { CLASS_DAYS, MAX_PUPILS, TRIN } from "@/lib/skole";
import { Shell } from "./Shell";
import s from "./skole.module.css";
import { useToast } from "./useToast";

interface Made {
  token: string;
  trin: number;
  codes: string[];
}

export function TeacherCreate() {
  const [trin, setTrin] = useState(8);
  const [antal, setAntal] = useState(24);
  const [made, setMade] = useState<Made | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/skole/klasse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trin, antal }) });
      if (!r.ok) throw new Error(String(r.status));
      setMade((await r.json()) as Made);
    } catch {
      setErr("Klassen kunne ikke oprettes. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(done);
    } catch {
      showToast("Kunne ikke kopiere. Markér teksten, og kopiér den selv.");
    }
  };

  const overviewPath = made ? `/skole/klasse/${made.token}` : "";
  const link = made ? `${window.location.origin}${overviewPath}` : "";
  const pupilAddress = made ? `${window.location.host}/skole` : "";

  return (
    <Shell right={<span className={s.teacherPill}>Lærer</span>} toast={toast}>
      <div className={`${s.wrap} ${s.wrapNarrow}`}>
        <h1 className={`${s.q} ${s.noPrint}`}>Opret klasse</h1>

        {!made && (
          <>
            <div className={`${s.card} ${s.createRow}`}>
              <div className={s.field}>
                <span className={s.label} id="trin-label">
                  Klassetrin
                </span>
                <div className={s.trinRow} role="group" aria-labelledby="trin-label">
                  {TRIN.map((t) => (
                    <button key={t} type="button" className={s.trinBtn} aria-pressed={trin === t} onClick={() => setTrin(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.field}>
                <span className={s.label}>Antal elever</span>
                <div className={s.stepper}>
                  <button type="button" aria-label="Færre elever" onClick={() => setAntal((a) => Math.max(1, a - 1))}>
                    −
                  </button>
                  <span aria-live="polite">{antal}</span>
                  <button type="button" aria-label="Flere elever" onClick={() => setAntal((a) => Math.min(MAX_PUPILS, a + 1))}>
                    +
                  </button>
                </div>
              </div>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={() => void create()}>
                Lav elevkoder
              </button>
            </div>
            <p className={s.info}>budgetpro gemmer ingen navne. Skriv selv, hvem der har hvilken kode.</p>
            {err && (
              <span className={s.err} role="alert">
                {err}
              </span>
            )}
          </>
        )}

        {made && (
          <>
            <div className={`${s.card} ${s.noPrint}`}>
              <span className={s.cardTitle}>Dit lærerlink</span>
              <p className={s.warn}>Linket er den eneste vej tilbage til klassen. Gem det, fx som bogmærke eller i en mail til dig selv. Del det ikke med eleverne.</p>
              <div className={s.linkBox}>
                <input className={s.input} readOnly value={link} aria-label="Lærerlink" onFocus={(e) => e.target.select()} />
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => void copy(link, "Linket er kopieret.")}>
                  Kopiér link
                </button>
                <a className={`${s.btn} ${s.btnSmall} ${s.btnPrimary}`} href={overviewPath}>
                  Gå til klasseoverblik
                </a>
              </div>
            </div>

            <div className={s.stack}>
              <div className={`${s.codesHead} ${s.noPrint}`}>
                <h2 className={s.h2}>
                  {made.codes.length} elevkoder · {made.trin}. klasse
                </h2>
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => void copy(made.codes.join("\n"), `${made.codes.length} koder kopieret.`)}>
                  Kopiér
                </button>
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => window.print()}>
                  Print
                </button>
              </div>
              <div className={s.printOnly}>
                <h1 className={s.h2}>budgetpro Skole · {made.trin}. klasse</h1>
                <p className={s.note}>Gå ind på {pupilAddress}, og skriv din kode. Klip langs de stiplede linjer.</p>
              </div>
              <div className={s.codes}>
                {made.codes.map((code, i) => (
                  <div key={code} className={s.codeCell}>
                    <span className={s.codeNo}>{i + 1}</span>
                    <span className={s.codeText} data-code>
                      {code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className={`${s.info} ${s.noPrint}`}>Koderne og elevernes valg slettes automatisk efter {CLASS_DAYS} dage.</p>
          </>
        )}
      </div>
    </Shell>
  );
}
```

- [ ] **Step 3: Create `components/skole/ClassOverview.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dayMonthYear, type ClassView } from "@/lib/skole";
import { Shell } from "./Shell";
import s from "./skole.module.css";

const REFRESH_MS = 15_000;

export function ClassOverview({ token, initial }: { token: string; initial: ClassView }) {
  const [view, setView] = useState(initial);
  const [gone, setGone] = useState(false);
  const url = `/api/skole/klasse/${encodeURIComponent(token)}`;

  // Pupils work while the teacher watches: fetch the numbers again now and then (not while the tab is hidden).
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (r.status === 404) setGone(true);
        else if (r.ok) setView((await r.json()) as ClassView);
      } catch {}
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [url]);

  const remove = async () => {
    if (!window.confirm("Vil du slette klassen? Koderne og elevernes valg bliver slettet, og det kan ikke fortrydes.")) return;
    const r = await fetch(url, { method: "DELETE" });
    if (r.ok || r.status === 404) setGone(true);
  };

  const right = <span className={s.teacherPill}>Lærer</span>;
  if (gone) {
    return (
      <Shell right={right}>
        <div className={`${s.wrap} ${s.wrapNarrow}`}>
          <div className={s.card}>
            <span className={s.cardTitle}>Klassen er slettet</span>
            <span className={s.note}>Koderne virker ikke længere, og elevernes valg er væk.</span>
            <Link className={`${s.btn} ${s.btnPrimary}`} href="/skole/laerer" style={{ alignSelf: "flex-start" }}>
              Opret en ny klasse
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const st = view.stats;
  const stats = [
    { v: st.topBolig ? `${st.topBolig.pct} %` : "–", l: st.topBolig ? `valgte ${st.topBolig.label.toLowerCase()}` : "har endnu ikke valgt bolig" },
    { v: `${st.finishedOk} af ${st.finished}`, l: "færdige elever fik budgettet til at gå op" },
    { v: st.topCase ?? "–", l: st.topCase ? "var den mest valgte case" : "ingen har valgt case endnu" },
  ];

  return (
    <Shell right={right}>
      <div className={s.wrap}>
        <div className={s.titleRow}>
          <h1 className={s.q}>Klasseoverblik</h1>
          <span className={s.note}>
            {view.trin}. klasse · {st.started} af {view.rows.length} elever i gang
          </span>
        </div>
        <div className={s.stats}>
          {stats.map((x) => (
            <div key={x.l} className={s.stat}>
              <b>{x.v}</b>
              <span>{x.l}</span>
            </div>
          ))}
        </div>
        <div className={s.table} role="table" aria-label="Elever">
          <div className={`${s.tr} ${s.th}`} role="row">
            <span role="columnheader">Elevkode</span>
            <span role="columnheader">Trin nået</span>
            <span role="columnheader">Går budgettet op</span>
            <span role="columnheader">Valgt case</span>
          </div>
          {view.rows.map((r) => (
            <div key={r.code} className={s.tr} role="row">
              <span role="cell">{r.code}</span>
              <span role="cell">{r.status}</span>
              <span role="cell" className={r.ok == null ? undefined : r.ok ? s.ok : s.notOk}>
                {r.ok == null ? "–" : r.ok ? "✓ Ja" : "✗ Nej"}
              </span>
              <span role="cell">{r.caseName ?? "–"}</span>
            </div>
          ))}
        </div>
        <span className={s.small} suppressHydrationWarning>
          Opdateres af sig selv. Klassen slettes automatisk {dayMonthYear(new Date(view.expires))}.
        </span>
        <div className={s.actions}>
          <Link className={s.btn} href="/skole/laerer">
            Opret en ny klasse
          </Link>
          <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => void remove()}>
            Slet klassen
          </button>
        </div>
      </div>
    </Shell>
  );
}
```

- [ ] **Step 4: Create `app/skole/laerer/page.tsx`**

```tsx
import type { Metadata } from "next";
import { TeacherCreate } from "@/components/skole/TeacherCreate";

export const metadata: Metadata = { title: "budgetpro Skole – opret klasse" };

export default function TeacherPage() {
  return <TeacherCreate />;
}
```

- [ ] **Step 5: Create `app/skole/klasse/[token]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ClassOverview } from "@/components/skole/ClassOverview";
import { Shell } from "@/components/skole/Shell";
import s from "@/components/skole/skole.module.css";
import { CLASS_DAYS } from "@/lib/skole";
import { classOverview, readClass } from "@/lib/skole-store";

export const metadata: Metadata = {
  title: "budgetpro Skole – klasseoverblik",
  robots: { index: false },
  // The secret is in the URL: don't send it on to other sites.
  referrer: "no-referrer",
};

export default async function ClassPage({ params }: PageProps<"/skole/klasse/[token]">) {
  const { token } = await params;
  const cls = await readClass(token.slice(0, 100));
  if (!cls) {
    return (
      <Shell right={<span className={s.teacherPill}>Lærer</span>}>
        <div className={`${s.wrap} ${s.wrapNarrow}`}>
          <div className={s.card}>
            <span className={s.cardTitle}>Linket virker ikke</span>
            <span className={s.note}>Klassen findes ikke længere, eller linket er ikke kopieret helt. En klasse slettes {CLASS_DAYS} dage efter, at den er oprettet.</span>
            <Link className={`${s.btn} ${s.btnPrimary}`} href="/skole/laerer" style={{ alignSelf: "flex-start" }}>
              Opret en ny klasse
            </Link>
          </div>
        </div>
      </Shell>
    );
  }
  return <ClassOverview token={token} initial={await classOverview(cls)} />;
}
```

- [ ] **Step 6: Typecheck, test, build**

Run: `pnpm typecheck`, `pnpm test`, `pnpm build`
Expected: all green; the build lists `/skole/laerer` and `/skole/klasse/[token]` (dynamic, ƒ).

- [ ] **Step 7: Check by hand**

With `pnpm dev`:
1. `http://localhost:3200/skole` → "Er du lærer? Opret en klasse." opens `/skole/laerer`.
2. Pick 9, press − until 3, "Lav elevkoder": three codes, the teacher link, the warning text. "Kopiér" shows "3 koder kopieret.". "Print" (print preview) shows only the heading, the pupil address and the codes as dashed slips.
3. "Gå til klasseoverblik": "9. klasse · 0 af 3 elever i gang", three rows "Ikke startet".
4. In another window, go through all 8 steps with the first code (Sara, Delelejlighed, Normalt/Normalt). Within 15 s the overview shows "Færdig", "✓ Ja", "Sara", and the stats "100 % valgte delelejlighed", "1 af 1", "Sara".
5. "Slet klassen" → confirm → "Klassen er slettet". The pupil code now gives "Den kode kender vi ikke. …". The old teacher link shows "Linket virker ikke".
6. 390 px wide: no sideways scrolling on `/skole/laerer` and the overview.

- [ ] **Step 8: Commit**

```bash
git add components/skole app/skole
git commit -m "Skole: teachers make a class with pupil codes and follow it in a live overview" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Known limits (accepted for now)

- Anyone can make a class (no teacher login); there is no rate limit on making classes or on trying codes. With 34,560 codes, someone guessing could open another pupil's code and change their choices – there are no names or free text behind a code, so the harm is small. Revisit if schools ask for logins.
- A teacher who loses the link can't get back to the class (by design – nothing ties a class to a person). They make a new one.
