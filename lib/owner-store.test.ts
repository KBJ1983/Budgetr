import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redeem, signup } from "./accounts";
import { adminLogin, isOwner, loadOverview, MAX_ADMIN_TRIES, LOCK_MS, readActivity, touchActivity } from "./owner-store";
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
    vi.stubEnv("ADMIN_PASSWORD", "");
    const link = await signup({ firstName: "Ejer", lastName: "Test", email: "ejer@eksempel.dk", phone: "+4512345678" }, now, dir);
    await redeem(link!.token, now, dir);
    const session = await makeSession(link!.account.id, now, dir);

    expect(await isOwner({ session }, now, dir, true)).toBe(true);
    expect(await isOwner({ session }, now, dir, false)).toBe(false);
    vi.stubEnv("OWNER_EMAILS", "anden@eksempel.dk, EJER@eksempel.dk");
    expect(await isOwner({ session }, now, dir, false)).toBe(true);
    expect(await isOwner({}, now, dir, false)).toBe(false);
    expect(await isOwner({ session: "u-aaaaaaaaaaaa.1.x" }, now, dir, false)).toBe(false);

    const o = await loadOverview(now, dir);
    expect(o.users.logins).toBe(1);
    expect(o.customers[0]).toMatchObject({ email: "ejer@eksempel.dk", status: "trial", category: "privat" });
  });

  it("logs the owner in with e-mail and the fixed password, and closes after too many wrong tries", async () => {
    vi.stubEnv("OWNER_EMAILS", "ejer@eksempel.dk");
    vi.stubEnv("ADMIN_PASSWORD", "kort");
    expect(await adminLogin("ejer@eksempel.dk", "kort", now, dir)).toEqual({ ok: false, error: "off" });

    vi.stubEnv("ADMIN_PASSWORD", "et-langt-test-kodeord");
    // With a password set, development needs the login too.
    expect(await isOwner({}, now, dir, true)).toBe(false);
    expect(await adminLogin("anden@eksempel.dk", "et-langt-test-kodeord", now, dir)).toEqual({ ok: false, error: "wrong" });
    expect(await adminLogin("ejer@eksempel.dk", "forkert", now, dir)).toEqual({ ok: false, error: "wrong" });

    const r = await adminLogin(" Ejer@Eksempel.dk ", "et-langt-test-kodeord", now, dir);
    if (!r.ok) throw new Error(r.error);
    expect(await isOwner({ admin: r.cookie }, now, dir, false)).toBe(true);
    expect(await isOwner({ admin: r.cookie + "x" }, now, dir, false)).toBe(false);
    expect(await isOwner({ admin: r.cookie }, new Date(now.getTime() + 8 * 86_400_000), dir, false)).toBe(false);
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(await isOwner({ admin: r.cookie }, now, dir, false)).toBe(false);

    vi.stubEnv("ADMIN_PASSWORD", "et-langt-test-kodeord");
    for (let i = 0; i < MAX_ADMIN_TRIES; i++) await adminLogin("ejer@eksempel.dk", "forkert", now, dir);
    expect(await adminLogin("ejer@eksempel.dk", "et-langt-test-kodeord", now, dir)).toEqual({ ok: false, error: "locked" });
    const later = new Date(now.getTime() + LOCK_MS + 1000);
    expect((await adminLogin("ejer@eksempel.dk", "et-langt-test-kodeord", later, dir)).ok).toBe(true);
  });
});
