/**
 * Teacher seats on budgetpro Skole. Every teacher can sign up and look around (the demo class), but only a teacher
 * with a seat can make classes. A seat is a grant from a school's agreement (lib/agreements.ts), taken with the code
 * from the seat mail – or at once, when a seat is waiting for the teacher's e-mail. The teacher keeps a pointer to it
 * (`Teacher.seat`); it counts only while the grant is still theirs (the school can take it back on /aftale) and its
 * months are not up.
 *
 * Teachers who signed up before seats existed keep making classes until EARLY_TEACHERS_UNTIL. So do the fictional
 * test teachers (@eksempel.dk) in development, so `pnpm smoke` can make a class without an agreement in the ledger.
 */
import { findGrant, grantCode, readGrant, useCode, waitingGrant } from "./agreements";
import { orgActive, today, type Org } from "./owner";
import { readLedger } from "./owner-store";
import { saveTeacher, type Teacher } from "./skole-teachers";

/** Teachers made before this moment came before seats … */
export const EARLY_TEACHERS_BEFORE = "2026-10-14T00:00:00.000Z";
/** … and may make classes without a seat until this day (the end of the school year). */
export const EARLY_TEACHERS_UNTIL = "2027-08-01";
/** "Bed om adgang" at most once a day per teacher. */
export const REQUEST_GAP_MS = 24 * 60 * 60 * 1000;

export interface SeatInfo {
  /** YYYY-MM-DD, the first day without the seat. */
  until: string;
  /** The school whose agreement the seat is from; empty for an early teacher. */
  school: string;
  early?: boolean;
}

/** The teacher's seat today, or null (then the teacher sees the demo and the ways to a seat). */
export async function teacherSeat(t: Teacher, now = new Date(), dir?: string): Promise<SeatInfo | null> {
  const day = today(now);
  if (t.seat && day < t.seat.until) {
    const g = await readGrant(t.seat.org, t.seat.grant, dir);
    if (g?.usedBy === t.id) {
      const org = (await readLedger(dir)).orgs.find((o) => o.id === t.seat!.org);
      return { until: t.seat.until, school: org?.name ?? "" };
    }
  }
  const testTeacher = process.env.NODE_ENV === "development" && t.email.endsWith("@eksempel.dk");
  if ((t.createdAt < EARLY_TEACHERS_BEFORE || testTeacher) && day < EARLY_TEACHERS_UNTIL) return { until: EARLY_TEACHERS_UNTIL, school: "", early: true };
  return null;
}

export type SeatTaken = { ok: true; seat: SeatInfo } | { ok: false; error: "unknown" | "used" | "expired" | "notSchool" };

/** The teacher takes the seat behind a code from a school's seat mail. A bank's code is refused, not spent. */
export async function takeSeat(t: Teacher, code: unknown, now = new Date(), dir?: string): Promise<SeatTaken> {
  const grant = await findGrant(code, dir);
  if (!grant) return { ok: false, error: "unknown" };
  const org = (await readLedger(dir)).orgs.find((o) => o.id === grant.org);
  if (!org) return { ok: false, error: "unknown" };
  if (org.category !== "skole") return { ok: false, error: "notSchool" };
  const r = await useCode(code, t.id, now, dir);
  if (!r.ok) return r;
  t.seat = { org: org.id, grant: r.grant.id, until: r.grant.until! };
  await saveTeacher(t, dir);
  return { ok: true, seat: { until: t.seat.until, school: org.name } };
}

/** The teacher's seat, taking one at once when a school has sent a seat to the teacher's e-mail. */
export async function claimWaitingSeat(t: Teacher, now = new Date(), dir?: string): Promise<SeatInfo | null> {
  const seat = await teacherSeat(t, now, dir);
  if (seat && !seat.early) return seat;
  const day = today(now);
  const schools = (await readLedger(dir)).orgs.filter((o) => o.category === "skole" && orgActive(o, day)).map((o) => o.id);
  const waiting = await waitingGrant(schools, t.email, now, dir);
  if (!waiting) return seat;
  const r = await takeSeat(t, await grantCode(waiting.id, dir), now, dir);
  return r.ok ? r.seat : seat;
}

export type SeatRequest = { ok: true; org: Org } | { ok: false; error: "unknown" | "limit" | "noAdmins" };

/**
 * A teacher without a seat asks a school with an agreement for one (by the school's exact name, as the sign-up
 * lookup shows it). Returns the school, whose kundeadmins the caller mails; noted on the teacher so it isn't repeated.
 */
export async function requestSeat(t: Teacher, school: unknown, now = new Date(), dir?: string): Promise<SeatRequest> {
  const name = typeof school === "string" ? school.trim() : "";
  const day = today(now);
  const org = (await readLedger(dir)).orgs.find((o) => o.category === "skole" && o.name === name && orgActive(o, day));
  if (!org) return { ok: false, error: "unknown" };
  if (!org.admins?.length) return { ok: false, error: "noAdmins" };
  if (t.lastRequestAt && now.getTime() - Date.parse(t.lastRequestAt) < REQUEST_GAP_MS) return { ok: false, error: "limit" };
  t.lastRequestAt = now.toISOString();
  await saveTeacher(t, dir);
  return { ok: true, org };
}
