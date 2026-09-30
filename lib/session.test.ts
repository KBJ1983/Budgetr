import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addMember, redeem, removeMember, signup } from "./accounts";
import { canAccess, makeSession, readSession, SESSION_MAX_AGE_S, sessionLogin } from "./session";

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
    expect(await readSession(c, t0, dir)).toEqual({ user: "u-abcdefghijkl" });
    const mc = await makeSession("u-abcdefghijkl", t0, dir, "m-abcdefgh");
    expect(await readSession(mc, t0, dir)).toEqual({ user: "u-abcdefghijkl", member: "m-abcdefgh" });
    expect(await readSession(mc.replace("m-abcdefgh", "m-zzzzzzzz"), t0, dir)).toBeNull();
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

describe("canAccess for a shared budget", () => {
  it("lets a member in with their own session until they are removed", async () => {
    const l = (await signup(input, t0, dir))!;
    await redeem(l.token, t0, dir);
    const r = await addMember(l.account.id, { firstName: "Bo", email: "bo@eksempel.dk" }, t0, dir);
    if (!r.ok) throw new Error(r.error);
    const cookie = await makeSession(l.account.id, t0, dir, r.link.member!.id);
    // Not before the invite is taken …
    expect(await canAccess(l.account.id, cookie, t0, dir)).toBe(false);
    await redeem(r.link.token, t0, dir);
    expect(await canAccess(l.account.id, cookie, t0, dir)).toBe(true);
    expect((await sessionLogin(l.account.id, cookie, t0, dir))?.member?.email).toBe("bo@eksempel.dk");
    // … and not after the member is taken off the budget.
    await removeMember(l.account.id, r.link.member!.id, dir);
    expect(await canAccess(l.account.id, cookie, t0, dir)).toBe(false);
  });
});
