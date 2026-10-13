import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "./kv";
import { validateTeacher } from "./skole";
import { emailHash, teacherClasses } from "./skole-store";
import {
  findTeacher, MAX_TEACHER_CODE_TRIES, readTeacher, redeemTeacherCode, redeemTeacherLink, requestTeacherLogin, signupTeacher, TEACHER_LOGIN_TTL_MS,
  TEACHER_RESEND_GAP_MS,
} from "./skole-teachers";

const now = new Date("2026-10-13T08:00:00Z");
const later = (ms: number) => new Date(now.getTime() + ms);
const input = { name: "Lærer Eksempel", school: "Eksempel Skole", email: "Laerer@Eksempel.dk" };

describe("teacher logins", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-teachers-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("checks the sign-up form", () => {
    expect(validateTeacher({ name: " Lærer ", school: "Skolen", email: " A@B.dk " })).toEqual({ ok: true, value: { name: "Lærer", school: "Skolen", email: "a@b.dk" } });
    expect(validateTeacher({ name: "", school: "x", email: "nej" })).toEqual({
      ok: false,
      errors: { name: "Skriv dit navn.", school: "Skriv navnet på din skole.", email: "Skriv en gyldig e-mail, fx navn@skole.dk." },
    });
  });

  it("signs up with a code that works once and confirms the e-mail", async () => {
    const m = await signupTeacher(input, now, dir);
    expect(m).toMatchObject({ purpose: "signup", teacher: { name: "Lærer Eksempel", school: "Eksempel Skole", email: "laerer@eksempel.dk" } });
    expect(m!.code).toMatch(/^\d{6}$/);
    const raw = await openStore(dir).get(`skole/laerer-konti/${m!.teacher.id}.json`);
    expect(raw).not.toContain(m!.code);
    expect(raw).not.toContain(m!.token.split(".")[1]);

    const spaced = `${m!.code.slice(0, 3)} ${m!.code.slice(3)}`;
    const t = await redeemTeacherCode("laerer@eksempel.dk", spaced, later(1000), dir);
    expect(t?.verifiedAt).toBe(later(1000).toISOString());
    expect(await redeemTeacherCode("laerer@eksempel.dk", m!.code, later(2000), dir)).toBeNull();
    expect(await redeemTeacherLink(m!.token, later(2000), dir)).toBeNull();
  });

  it("logs in by link, and a confirmed teacher keeps their details", async () => {
    const first = await signupTeacher(input, now, dir);
    await redeemTeacherLink(first!.token, now, dir);
    expect(await signupTeacher({ ...input, name: "Ny" }, later(10_000), dir)).toBeNull(); // within the resend gap
    const again = await signupTeacher({ ...input, name: "Ny" }, later(TEACHER_RESEND_GAP_MS), dir);
    expect(again?.purpose).toBe("login");
    expect((await readTeacher(first!.teacher.id, dir))?.name).toBe("Lærer Eksempel");
    expect((await redeemTeacherLink(again!.token, later(TEACHER_RESEND_GAP_MS + 1), dir))?.id).toBe(first!.teacher.id);
  });

  it("asks for login codes only for known e-mails, and they expire", async () => {
    expect(await requestTeacherLogin("ukendt@eksempel.dk", now, dir)).toBeNull();
    await signupTeacher(input, now, dir);
    const m = await requestTeacherLogin("laerer@eksempel.dk", later(TEACHER_RESEND_GAP_MS), dir);
    expect(m?.purpose).toBe("signup");
    expect(await redeemTeacherCode("laerer@eksempel.dk", m!.code, later(TEACHER_RESEND_GAP_MS + TEACHER_LOGIN_TTL_MS + 1), dir)).toBeNull();
  });

  it("spends the code after too many wrong tries", async () => {
    const m = await signupTeacher(input, now, dir);
    const wrong = m!.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < MAX_TEACHER_CODE_TRIES; i++) expect(await redeemTeacherCode(input.email, wrong, now, dir)).toBeNull();
    expect(await redeemTeacherCode(input.email, m!.code, now, dir)).toBeNull();
    expect(await redeemTeacherLink(m!.token, now, dir)).toBeNull();
  });

  it("brings over the classes made with the same e-mail before there were logins", async () => {
    const store = openStore(dir);
    const h = emailHash(input.email);
    await store.set("skole/klasser/0000000001.json", JSON.stringify({ id: "0000000001", trin: 8, created: now.toISOString(), tokenHash: "x", emailHash: h, codes: [] }));
    await store.set(`skole/laerere/${h}.json`, JSON.stringify({ classes: ["0000000001"] }));
    const m = await signupTeacher(input, now, dir);
    const t = await redeemTeacherCode(input.email, m!.code, now, dir);
    expect((await teacherClasses(t!.id, now, dir)).map((c) => c.id)).toEqual(["0000000001"]);
    expect((await findTeacher(" LAERER@eksempel.dk", dir))?.id).toBe(t!.id);
  });
});
