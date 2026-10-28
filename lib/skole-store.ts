/**
 * budgetpro Skole's classes (the flow and its numbers are in lib/skole.ts; the teachers in lib/skole-teachers.ts),
 * in the store (lib/kv.ts):
 *
 *   skole/klasser/<id>.json          { id, trin, name?, created, days, teacherId, codes }
 *   skole/koder/<key>.json           { code, classId, created, expires, flow?, answers?, updated? }   key = code with Æ/Ø/Å spelled out
 *   skole/laerer-klasser/<tid>.json  { classes: [id…] }   the classes of one teacher
 *
 * Only the teacher who made a class can open it. No names: a pupil is only a code. The teacher can read each pupil's
 * choices and reflection answers, which is why the pupils are told not to write names. Codes are reserved with add(),
 * so no two classes share one. A class lives the days the teacher picked: after that, reading it deletes it, and
 * making a new class sweeps the expired ones.
 *
 * Before teachers had logins, a class was opened by a secret link and kept a hash of the teacher's e-mail, with an
 * index per e-mail hash in skole/laerere/<hash>.json. adoptLegacyClasses() hands those classes to the teacher who
 * signs up with that e-mail.
 */
import { createHash, randomBytes, randomInt } from "node:crypto";
import { openStore } from "./kv";
import { normalizeEmail } from "./signup";
import {
  classStats, cleanClassName, DEFAULT_DAYS, isCode, LIFETIMES, MAX_PUPILS, pupilDetail, pupilRow, randomCode, TRIN,
  type Answers, type ClassSummary, type ClassView, type Flow, type PupilDetail,
} from "./skole";

export interface SchoolClass {
  id: string;
  trin: number;
  /** The teacher's own name for the class ("8.A"); cleaned with cleanClassName. */
  name?: string;
  created: string;
  /** Lifetime in days (missing on the first classes, which got DEFAULT_DAYS). */
  days?: number;
  teacherId?: string;
  /** Left on classes made before teacher logins. */
  emailHash?: string;
  codes: string[];
}

interface CodeRecord {
  code: string;
  classId: string;
  created: string;
  expires?: string;
  flow?: Flow;
  answers?: Answers;
  updated?: string;
}

interface ClassIndex {
  classes: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CLASSES = "skole/klasser";
const classKey = (id: string) => `${CLASSES}/${id}.json`;
const teacherClassesKey = (teacherId: string) => `skole/laerer-klasser/${teacherId}.json`;
const legacyIndexKey = (h: string) => `skole/laerere/${h}.json`;
export const codeKey = (code: string) => `skole/koder/${code.replace(/Æ/g, "AE").replace(/Ø/g, "OE").replace(/Å/g, "AA")}.json`;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
/** How the e-mail was kept on classes made before teacher logins. */
export const emailHash = (email: string) => hash(`budgetpro-skole:${normalizeEmail(email)}`);
export const isClassId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{10}$/.test(id);

/** When the class's codes stop working and everything is deleted. */
export const classExpires = (cls: Pick<SchoolClass, "created" | "days">) => new Date(Date.parse(cls.created) + (cls.days ?? DEFAULT_DAYS) * DAY_MS);
const codeExpires = (r: CodeRecord) => (r.expires ? new Date(r.expires) : new Date(Date.parse(r.created) + DEFAULT_DAYS * DAY_MS));
/** Also true for a broken date, so a bad record goes away. */
const past = (d: Date, now: Date) => !(now < d);

function parse<T>(text: string | null): T | null {
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

async function readIndex(teacherId: string, dir?: string): Promise<string[]> {
  return parse<ClassIndex>(await openStore(dir).get(teacherClassesKey(teacherId)))?.classes ?? [];
}

async function writeIndex(teacherId: string, classes: string[], dir?: string): Promise<void> {
  await openStore(dir).set(teacherClassesKey(teacherId), JSON.stringify({ classes } satisfies ClassIndex));
}

export interface NewClass {
  trin: number;
  name?: string;
  count: number;
  days: number;
  teacherId: string;
}

/** Makes a class with `count` new codes for the teacher. */
export async function createClass(o: NewClass, now = new Date(), dir?: string): Promise<SchoolClass> {
  const { trin, count, days, teacherId } = o;
  if (!TRIN.includes(trin) || !LIFETIMES.includes(days) || !Number.isInteger(count) || count < 1 || count > MAX_PUPILS) throw new Error("Invalid class");
  const store = openStore(dir);
  await sweep(now, dir);
  const id = randomBytes(5).toString("hex");
  const created = now.toISOString();
  const expires = new Date(now.getTime() + days * DAY_MS).toISOString();
  const codes: string[] = [];
  for (let tries = 0; codes.length < count; tries++) {
    if (tries > count * 50) throw new Error("No free pupil codes");
    const code = randomCode(() => randomInt(0, 2 ** 32) / 2 ** 32);
    const record: CodeRecord = { code, classId: id, created, expires };
    if (await store.add(codeKey(code), JSON.stringify(record))) codes.push(code);
  }
  const name = cleanClassName(o.name);
  const cls: SchoolClass = { id, trin, ...(name ? { name } : {}), created, days, teacherId, codes };
  await store.set(classKey(id), JSON.stringify(cls));
  await writeIndex(teacherId, [...(await readIndex(teacherId, dir)), id], dir);
  return cls;
}

/** The teacher's class, or null (unknown, someone else's or expired – an expired one is deleted). */
export async function readClassFor(teacherId: string, id: string, now = new Date(), dir?: string): Promise<SchoolClass | null> {
  if (!isClassId(id)) return null;
  const cls = parse<SchoolClass>(await openStore(dir).get(classKey(id)));
  if (!cls || cls.teacherId !== teacherId) return null;
  if (past(classExpires(cls), now)) {
    await deleteClass(cls, dir);
    return null;
  }
  return cls;
}

/** Gives the class its own name ("8.A"), or takes it off with "". */
export async function renameClass(cls: SchoolClass, name: unknown, dir?: string): Promise<SchoolClass> {
  const clean = cleanClassName(name);
  const next: SchoolClass = { ...cls };
  if (clean) next.name = clean;
  else delete next.name;
  await openStore(dir).set(classKey(cls.id), JSON.stringify(next));
  return next;
}

/** Deletes a class with its codes and the pupils' work. */
export async function deleteClass(cls: SchoolClass, dir?: string): Promise<void> {
  const store = openStore(dir);
  await Promise.all(cls.codes.map((c) => store.del(codeKey(c))));
  await store.del(classKey(cls.id));
  if (cls.teacherId) await writeIndex(cls.teacherId, (await readIndex(cls.teacherId, dir)).filter((id) => id !== cls.id), dir);
}

/** The teacher's live classes, newest first, with how far the pupils are. Expired classes are deleted on the way. */
export async function teacherClasses(teacherId: string, now = new Date(), dir?: string): Promise<ClassSummary[]> {
  const store = openStore(dir);
  const out: ClassSummary[] = [];
  for (const id of await readIndex(teacherId, dir)) {
    const cls = parse<SchoolClass>(await store.get(classKey(id)));
    if (!cls || cls.teacherId !== teacherId) continue;
    if (past(classExpires(cls), now)) {
      await deleteClass(cls, dir);
      continue;
    }
    const { stats } = await classOverview(cls, dir);
    out.push({
      id,
      trin: cls.trin,
      ...(cls.name ? { name: cls.name } : {}),
      created: cls.created,
      expires: classExpires(cls).toISOString(),
      days: cls.days ?? DEFAULT_DAYS,
      codes: cls.codes,
      started: stats.started,
      finished: stats.finished,
    });
  }
  await writeIndex(teacherId, out.map((c) => c.id), dir);
  return out.sort((a, b) => b.created.localeCompare(a.created));
}

/**
 * Hands the live classes made with this e-mail before teacher logins to the teacher. Returns how many were moved.
 * Their secret links stop working: only the teacher's login opens them now.
 */
export async function adoptLegacyClasses(teacherId: string, email: string, now = new Date(), dir?: string): Promise<number> {
  const store = openStore(dir);
  const h = emailHash(email);
  const legacy = parse<ClassIndex>(await store.get(legacyIndexKey(h)));
  if (!legacy) return 0;
  const moved: string[] = [];
  for (const id of legacy.classes) {
    const cls = parse<SchoolClass>(await store.get(classKey(id)));
    if (!cls || cls.emailHash !== h || cls.teacherId || past(classExpires(cls), now)) continue;
    const next: SchoolClass = { id: cls.id, trin: cls.trin, created: cls.created, days: cls.days ?? DEFAULT_DAYS, teacherId, codes: cls.codes };
    await store.set(classKey(id), JSON.stringify(next));
    moved.push(id);
  }
  if (moved.length) await writeIndex(teacherId, [...(await readIndex(teacherId, dir)), ...moved], dir);
  await store.del(legacyIndexKey(h));
  return moved.length;
}

async function readCode(code: string, now: Date, dir?: string): Promise<CodeRecord | null> {
  if (!isCode(code)) return null;
  const r = parse<CodeRecord>(await openStore(dir).get(codeKey(code)));
  return r && r.code === code && !past(codeExpires(r), now) ? r : null;
}

/** A pupil's code: null when unknown or expired; otherwise the saved work (flow null before the first save). */
export async function lookupCode(code: string, now = new Date(), dir?: string): Promise<{ flow: Flow | null; answers: Answers; expires: string } | null> {
  const r = await readCode(code, now, dir);
  return r ? { flow: r.flow ?? null, answers: r.answers ?? {}, expires: codeExpires(r).toISOString() } : null;
}

/** Saves a pupil's choices and answers (already checked with sanitizeFlow/sanitizeAnswers). False for an unknown code. */
export async function saveProgress(code: string, flow: Flow, answers: Answers, now = new Date(), dir?: string): Promise<boolean> {
  const r = await readCode(code, now, dir);
  if (!r) return false;
  const next: CodeRecord = { ...r, flow, answers, updated: now.toISOString() };
  await openStore(dir).set(codeKey(code), JSON.stringify(next));
  return true;
}

export async function classOverview(cls: SchoolClass, dir?: string): Promise<ClassView> {
  const store = openStore(dir);
  const records = await Promise.all(
    cls.codes.map(async (c) => {
      const r = parse<CodeRecord>(await store.get(codeKey(c)));
      return r?.classId === cls.id ? r : null;
    }),
  );
  const flows = records.map((r) => r?.flow ?? null);
  return {
    id: cls.id,
    trin: cls.trin,
    ...(cls.name ? { name: cls.name } : {}),
    codes: cls.codes,
    created: cls.created,
    expires: classExpires(cls).toISOString(),
    days: cls.days ?? DEFAULT_DAYS,
    rows: cls.codes.map((c, i) => pupilRow(c, flows[i] ?? null, records[i]?.flow ? records[i]?.updated : undefined)),
    stats: classStats(flows),
  };
}

/** One pupil of the class, for the teacher; null when the code isn't in the class. */
export async function classPupil(cls: SchoolClass, code: string, dir?: string): Promise<PupilDetail | null> {
  if (!cls.codes.includes(code)) return null;
  const r = parse<CodeRecord>(await openStore(dir).get(codeKey(code)));
  const mine = r?.classId === cls.id ? r : null;
  return pupilDetail(code, mine?.flow ?? null, mine?.answers ?? {});
}

async function sweep(now: Date, dir?: string): Promise<void> {
  const store = openStore(dir);
  const names = (await store.list(CLASSES)).filter((n) => n.endsWith(".json"));
  for (const n of names) {
    const cls = parse<SchoolClass>(await store.get(`${CLASSES}/${n}`));
    if (cls && past(classExpires(cls), now)) await deleteClass(cls, dir);
  }
}
