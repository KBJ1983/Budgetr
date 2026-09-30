import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { redeem, signup } from "./accounts";
import { canAccess, makeSession, readSession, SESSION_MAX_AGE_S } from "./session";

const t0 = new Date("2026-09-30T10:00:00Z");
const input = { firstName: "Anna", lastName: "Eksempel", email: "anna@eksempel.dk", phone: "+4512345678" };

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "budgetr-session-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("session cookie", () => {
  it("round-trips, expires and rejects tampering", async () => {
    const c = await makeSession("u-abcdefghijkl", t0, dir);
    expect(await readSession(c, t0, dir)).toBe("u-abcdefghijkl");
    expect(await readSession(c, new Date(t0.getTime() + SESSION_MAX_AGE_S * 1000 + 1), dir)).toBeNull();
    expect(await readSession(c.replace("u-abcdefghijkl", "u-zzzzzzzzzzzz"), t0, dir)).toBeNull();
    expect(await readSession(undefined, t0, dir)).toBeNull();
    expect(await readSession("kbj.1.x", t0, dir)).toBeNull();
  });
});

describe("canAccess", () => {
  it("lets test users in without a cookie", async () => {
    expect(await canAccess("test1", undefined, t0, dir)).toBe(true);
    expect(await canAccess("nobody", undefined, t0, dir)).toBe(false);
  });

  it("lets an account in only with its own session, and only once the e-mail is confirmed", async () => {
    const l = (await signup(input, t0, dir))!;
    const id = l.account.id;
    const cookie = await makeSession(id, t0, dir);
    expect(await canAccess(id, cookie, t0, dir)).toBe(false);
    await redeem(l.token, t0, dir);
    expect(await canAccess(id, cookie, t0, dir)).toBe(true);
    expect(await canAccess(id, undefined, t0, dir)).toBe(false);
    expect(await canAccess(id, await makeSession("u-abcdefghijkl", t0, dir), t0, dir)).toBe(false);
  });
});
