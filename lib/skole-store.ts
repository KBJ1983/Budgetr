/**
 * budgetpro Skole's classes (the flow and its numbers are in lib/skole.ts), in the store (lib/kv.ts):
 *
 *   skole/klasser/<id>.json    { id, trin, created, days, tokenHash, emailHash?, codes }
 *   skole/koder/<key>.json     { code, classId, created, expires, flow?, answers?, updated? }   key = code with Æ/Ø/Å spelled out
 *   skole/laerere/<hash>.json  { classes: [id…], lastMailAt? }   the classes made with one teacher e-mail
 *
 * No names: a pupil is only a code. The teacher can read each pupil's choices and reflection answers, which is why
 * the pupils are told not to write names. The teacher's link holds "<id>.<secret>"; only a hash of the secret is
 * stored. The teacher's e-mail is only kept as a hash too: enough to mail new links to the same address later (that
 * makes a new secret, so old links stop working), but the address itself can't be read back.
 * Codes are reserved with add(), so no two classes share one. A class lives the days the teacher picked: after that
 * reading it deletes it, and making a new class sweeps the expired ones.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { openStore } from "./kv";
import { normalizeEmail } from "./signup";
import {
  classStats, DEFAULT_DAYS, isCode, LIFETIMES, MAX_PUPILS, pupilDetail, pupilRow, randomCode, TRIN,
  type Answers, type ClassView, type Flow, type PupilDetail,
} from "./skole";

export interface SchoolClass {
  id: string;
  trin: number;
  created: string;
  /** Lifetime in days (missing on classes made before the teacher could pick). */
  days?: number;
  tokenHash: string;
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

interface TeacherIndex {
  classes: string[];
  lastMailAt?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** No new links to the same e-mail within this gap. */
export const RELINK_GAP_MS = 2 * 60 * 1000;
const CLASSES = "skole/klasser";
const classKey = (id: string) => `${CLASSES}/${id}.json`;
const teacherKey = (h: string) => `skole/laerere/${h}.json`;
export const codeKey = (code: string) => `skole/koder/${code.replace(/Æ/g, "AE").replace(/Ø/g, "OE").replace(/Å/g, "AA")}.json`;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const emailHash = (email: string) => hash(`budgetpro-skole:${normalizeEmail(email)}`);

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

const newSecret = () => randomBytes(18).toString("base64url");

export interface NewClass {
  trin: number;
  count: number;
  days: number;
  /** The teacher's e-mail; only its hash is kept. */
  email?: string;
}

/** Makes a class with `count` new codes. Returns the teacher's link token – the only time it exists in full. */
export async function createClass(o: NewClass, now = new Date(), dir?: string): Promise<{ token: string; cls: SchoolClass }> {
  const { trin, count, days } = o;
  if (!TRIN.includes(trin) || !LIFETIMES.includes(days) || !Number.isInteger(count) || count < 1 || count > MAX_PUPILS) throw new Error("Invalid class");
  const store = openStore(dir);
  await sweep(now, dir);
  const id = randomBytes(5).toString("hex");
  const secret = newSecret();
  const created = now.toISOString();
  const expires = new Date(now.getTime() + days * DAY_MS).toISOString();
  const codes: string[] = [];
  for (let tries = 0; codes.length < count; tries++) {
    if (tries > count * 50) throw new Error("No free pupil codes");
    const code = randomCode(() => randomInt(0, 2 ** 32) / 2 ** 32);
    const record: CodeRecord = { code, classId: id, created, expires };
    if (await store.add(codeKey(code), JSON.stringify(record))) codes.push(code);
  }
  const cls: SchoolClass = { id, trin, created, days, tokenHash: hash(secret), codes };
  if (o.email) {
    cls.emailHash = emailHash(o.email);
    const index = parse<TeacherIndex>(await store.get(teacherKey(cls.emailHash))) ?? { classes: [] };
    await store.set(teacherKey(cls.emailHash), JSON.stringify({ ...index, classes: [...index.classes, id] }));
  }
  await store.set(classKey(id), JSON.stringify(cls));
  return { token: `${id}.${secret}`, cls };
}

/** The class behind a teacher link, or null (unknown, wrong secret or expired). */
export async function readClass(token: string, now = new Date(), dir?: string): Promise<SchoolClass | null> {
  const m = /^([0-9a-f]{10})\.([\w-]{24})$/.exec(token);
  if (!m) return null;
  const cls = parse<SchoolClass>(await openStore(dir).get(classKey(m[1]!)));
  if (!cls) return null;
  const a = Buffer.from(hash(m[2]!));
  const b = Buffer.from(String(cls.tokenHash ?? ""));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (past(classExpires(cls), now)) {
    await deleteClass(cls, dir);
    return null;
  }
  return cls;
}

/** Deletes a class with its codes and the pupils' work. */
export async function deleteClass(cls: SchoolClass, dir?: string): Promise<void> {
  const store = openStore(dir);
  await Promise.all(cls.codes.map((c) => store.del(codeKey(c))));
  await store.del(classKey(cls.id));
  if (cls.emailHash) {
    const index = parse<TeacherIndex>(await store.get(teacherKey(cls.emailHash)));
    if (index) await store.set(teacherKey(cls.emailHash), JSON.stringify({ ...index, classes: index.classes.filter((id) => id !== cls.id) }));
  }
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
  const flows = await Promise.all(
    cls.codes.map(async (c) => {
      const r = parse<CodeRecord>(await store.get(codeKey(c)));
      return r?.classId === cls.id ? (r.flow ?? null) : null;
    }),
  );
  return {
    trin: cls.trin,
    created: cls.created,
    expires: classExpires(cls).toISOString(),
    days: cls.days ?? DEFAULT_DAYS,
    rows: cls.codes.map((c, i) => pupilRow(c, flows[i] ?? null)),
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

/**
 * New links to every live class made with this e-mail ("Har du mistet linket?"). Each class gets a new secret, so
 * the old links stop working. "throttled" when links went to this e-mail less than RELINK_GAP_MS ago.
 */
export async function newTeacherLinks(email: string, now = new Date(), dir?: string): Promise<{ cls: SchoolClass; token: string }[] | "throttled"> {
  const store = openStore(dir);
  const h = emailHash(email);
  const index = parse<TeacherIndex>(await store.get(teacherKey(h)));
  if (!index) return [];
  if (index.lastMailAt && now.getTime() - Date.parse(index.lastMailAt) < RELINK_GAP_MS) return "throttled";
  const out: { cls: SchoolClass; token: string }[] = [];
  for (const id of index.classes) {
    const cls = parse<SchoolClass>(await store.get(classKey(id)));
    if (!cls || cls.emailHash !== h || past(classExpires(cls), now)) continue;
    const secret = newSecret();
    const next = { ...cls, tokenHash: hash(secret) };
    await store.set(classKey(id), JSON.stringify(next));
    out.push({ cls: next, token: `${id}.${secret}` });
  }
  await store.set(teacherKey(h), JSON.stringify({ classes: out.map((x) => x.cls.id), lastMailAt: now.toISOString() }));
  return out;
}

async function sweep(now: Date, dir?: string): Promise<void> {
  const store = openStore(dir);
  const names = (await store.list(CLASSES)).filter((n) => n.endsWith(".json"));
  for (const n of names) {
    const cls = parse<SchoolClass>(await store.get(`${CLASSES}/${n}`));
    if (cls && past(classExpires(cls), now)) await deleteClass(cls, dir);
  }
}
