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
  const cls = parse<SchoolClass>(await openStore(dir).get(classKey(m[1]!)));
  if (!cls) return null;
  const a = Buffer.from(hash(m[2]!));
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
    rows: cls.codes.map((c, i) => pupilRow(c, flows[i] ?? null)),
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
