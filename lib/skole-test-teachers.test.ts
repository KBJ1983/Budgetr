import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EARLY_TEACHERS_UNTIL, teacherSeat } from "./skole-seats";
import { findTestTeacher, openTestTeacher, TEST_SCHOOL } from "./skole-test-teachers";
import { isTeacherId, readTeacher } from "./skole-teachers";

describe("test teachers", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-testlaerer-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("finds LÆRER1 however it is typed, and nothing else", () => {
    for (const typed of ["LÆRER1", "lærer1", " LAERER1 ", "Lærer 1"]) expect(findTestTeacher(typed)?.login).toBe("LÆRER1");
    expect(findTestTeacher("LÆRER9")).toBeUndefined();
    expect(findTestTeacher("laerer1@skole.dk")).toBeUndefined();
    expect(findTestTeacher(42)).toBeUndefined();
  });

  it("makes a confirmed teacher on Testskolen who may make classes without a seat", async () => {
    const now = new Date("2026-11-02T10:00:00Z");
    const tt = findTestTeacher("LÆRER2")!;
    expect(isTeacherId(tt.id)).toBe(true);
    const t = await openTestTeacher(tt, now, dir);
    expect(t).toMatchObject({ id: tt.id, school: TEST_SCHOOL, verifiedAt: now.toISOString() });
    expect(await readTeacher(tt.id, dir)).toEqual(t);
    expect(await openTestTeacher(tt, new Date("2026-12-01T10:00:00Z"), dir)).toEqual(t);
    expect(await teacherSeat(t, now, dir)).toEqual({ until: EARLY_TEACHERS_UNTIL, school: TEST_SCHOOL, early: true });
  });
});
