import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redeem, signup } from "./accounts";
import { isOwner, loadOverview, readActivity, touchActivity } from "./owner-store";
import { makeSession } from "./session";

const now = new Date("2026-10-07T10:00:00Z");

describe("owner store", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-owner-"));
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  it("notes activity at most once an hour per login, and only for real accounts", async () => {
    await touchActivity("u-aaaaaaaaaaaa", "u-aaaaaaaaaaaa", now, dir);
    await touchActivity("u-aaaaaaaaaaaa", "u-aaaaaaaaaaaa", new Date(now.getTime() + 60_000), dir);
    await touchActivity("u-aaaaaaaaaaaa", "m-aaaaaaaa", new Date(now.getTime() + 60_000), dir);
    await touchActivity("kbj", "kbj", now, dir);
    expect(await readActivity(["u-aaaaaaaaaaaa", "kbj"], dir)).toEqual({
      "u-aaaaaaaaaaaa": { "u-aaaaaaaaaaaa": now.toISOString(), "m-aaaaaaaa": new Date(now.getTime() + 60_000).toISOString() },
    });
  });

  it("lets only owner e-mails in outside development", async () => {
    const link = await signup({ firstName: "Ejer", lastName: "Test", email: "ejer@eksempel.dk", phone: "+4512345678" }, now, dir);
    await redeem(link!.token, now, dir);
    const cookie = await makeSession(link!.account.id, now, dir);

    expect(await isOwner(cookie, now, dir, true)).toBe(true);
    expect(await isOwner(cookie, now, dir, false)).toBe(false);
    vi.stubEnv("OWNER_EMAILS", "anden@eksempel.dk, EJER@eksempel.dk");
    expect(await isOwner(cookie, now, dir, false)).toBe(true);
    expect(await isOwner(undefined, now, dir, false)).toBe(false);
    expect(await isOwner("u-aaaaaaaaaaaa.1.x", now, dir, false)).toBe(false);

    const o = await loadOverview(now, dir);
    expect(o.users.logins).toBe(1);
    expect(o.customers[0]).toMatchObject({ email: "ejer@eksempel.dk", status: "trial", category: "privat" });
  });
});
