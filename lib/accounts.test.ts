import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addMember,
  findByEmail,
  listLogins,
  MAX_LOGINS,
  LOGIN_TTL_MS,
  MAX_CODE_TRIES,
  readAccount,
  redeem,
  redeemCode,
  removeMember,
  requestLogin,
  RESEND_GAP_MS,
  signup,
  validateSignup,
  VERIFY_TTL_MS,
} from "./accounts";
import { readProfile } from "./profile";
import { isAccountId } from "./users";

const input = { firstName: "Anna", lastName: "Eksempel", email: "anna@eksempel.dk", phone: "+4512345678" };
const t0 = new Date("2026-09-30T10:00:00Z");
const later = (ms: number) => new Date(t0.getTime() + ms);

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "budgetr-accounts-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("validateSignup", () => {
  it("accepts the four fields, trims them and normalizes e-mail and phone", () => {
    const v = validateSignup({ firstName: "  Anna ", lastName: "Eksempel  Hansen", email: " Anna@Eksempel.DK ", phone: "12 34 56 78" });
    expect(v).toEqual({
      ok: true,
      value: { firstName: "Anna", lastName: "Eksempel Hansen", email: "anna@eksempel.dk", phone: "+4512345678" },
    });
    expect(validateSignup({ ...input, phone: "0045 12345678" }).ok).toBe(true);
  });
  it("names every missing or wrong field", () => {
    const v = validateSignup({ firstName: " ", email: "anna@", phone: "1234" });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(Object.keys(v.errors).sort()).toEqual(["email", "firstName", "lastName", "phone"]);
    expect(validateSignup(null).ok).toBe(false);
  });
});

describe("signup and confirm", () => {
  it("creates an unconfirmed account and a confirm link that works once", async () => {
    const l = await signup(input, t0, dir);
    expect(l?.purpose).toBe("verify");
    const id = l!.account.id;
    expect(isAccountId(id)).toBe(true);
    expect((await readAccount(id, dir))?.verifiedAt).toBeUndefined();
    // The stored file never holds the token itself.
    expect(await readFile(path.join(dir, "accounts", `${id}.json`), "utf8")).not.toContain(l!.token.split(".")[1]);

    const a = await redeem(l!.token, later(1000), dir);
    expect(a?.account.verifiedAt).toBe(later(1000).toISOString());
    expect(await readProfile(id, dir)).toEqual({ email: "anna@eksempel.dk", phone: "+4512345678" });
    expect(await redeem(l!.token, later(2000), dir)).toBeNull();
  });

  it("rejects wrong, malformed and expired links", async () => {
    const l = (await signup(input, t0, dir))!;
    expect(await redeem(l.token.slice(0, -2) + "xx", t0, dir)).toBeNull();
    expect(await redeem("nonsense", t0, dir)).toBeNull();
    expect(await redeem(42, t0, dir)).toBeNull();
    expect(await redeem(l.token, later(VERIFY_TTL_MS + 1), dir)).toBeNull();
  });

  it("does not make a second account for the same e-mail and throttles repeated mails", async () => {
    const first = (await signup(input, t0, dir))!;
    expect(await signup({ ...input, phone: "+4587654321" }, later(1000), dir)).toBeNull();
    const again = (await signup({ ...input, firstName: "Anne" }, later(RESEND_GAP_MS + 1), dir))!;
    expect(again.account.id).toBe(first.account.id);
    expect(again.purpose).toBe("verify");
    // An unconfirmed account takes the newest details; the old link is replaced.
    expect((await readAccount(first.account.id, dir))?.firstName).toBe("Anne");
    expect(await redeem(first.token, later(RESEND_GAP_MS + 2), dir)).toBeNull();
    expect((await readdir(path.join(dir, "accounts"))).length).toBe(1);
  });

  it("gives a confirmed account a login link on signup and keeps its details", async () => {
    const l = (await signup(input, t0, dir))!;
    await redeem(l.token, t0, dir);
    const again = (await signup({ ...input, firstName: "Mallory", phone: "+4587654321" }, later(RESEND_GAP_MS + 1), dir))!;
    expect(again.purpose).toBe("login");
    expect((await readAccount(l.account.id, dir))?.firstName).toBe("Anna");
  });
});

describe("login links", () => {
  it("sends nothing for an unknown e-mail", async () => {
    expect(await requestLogin("ingen@eksempel.dk", t0, dir)).toBeNull();
  });

  it("gives a confirm link before, and a short-lived login link after, confirmation", async () => {
    const l = (await signup(input, t0, dir))!;
    expect((await requestLogin("ANNA@eksempel.dk", later(RESEND_GAP_MS + 1), dir))?.purpose).toBe("verify");
    const t1 = later(3 * RESEND_GAP_MS);
    const v = (await requestLogin(input.email, t1, dir))!;
    await redeem(v.token, t1, dir);
    const t2 = later(5 * RESEND_GAP_MS);
    const login = (await requestLogin(input.email, t2, dir))!;
    expect(login.purpose).toBe("login");
    expect(await redeem(login.token, new Date(t2.getTime() + LOGIN_TTL_MS + 1), dir)).toBeNull();
    expect((await findByEmail(input.email, dir))?.id).toBe(l.account.id);
  });
});

describe("codes", () => {
  const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");

  it("confirms with the mailed code instead of the link, once, and spends the link too", async () => {
    const l = (await signup(input, t0, dir))!;
    expect(l.code).toMatch(/^\d{6}$/);
    expect(await readFile(path.join(dir, "accounts", `${l.account.id}.json`), "utf8")).not.toContain(l.code);
    const a = await redeemCode(" ANNA@eksempel.dk ", `${l.code.slice(0, 3)} ${l.code.slice(3)}`, later(1000), dir);
    expect(a?.account.verifiedAt).toBe(later(1000).toISOString());
    expect(await readProfile(l.account.id, dir)).toEqual({ email: "anna@eksempel.dk", phone: "+4512345678" });
    expect(await redeemCode(input.email, l.code, later(2000), dir)).toBeNull();
    expect(await redeem(l.token, later(2000), dir)).toBeNull();
  });

  it("stops working when the link is used, the code expires or the e-mail is someone else's", async () => {
    const l = (await signup(input, t0, dir))!;
    expect(await redeemCode("ingen@eksempel.dk", l.code, t0, dir)).toBeNull();
    expect(await redeemCode(input.email, l.code, later(VERIFY_TTL_MS + 1), dir)).toBeNull();
    expect(await redeemCode(input.email, "12345", t0, dir)).toBeNull();
    expect(await redeemCode(input.email, 123456, t0, dir)).toBeNull();
    await redeem(l.token, t0, dir);
    expect(await redeemCode(input.email, l.code, t0, dir)).toBeNull();
  });

  it(`spends link and code after ${MAX_CODE_TRIES} wrong codes`, async () => {
    const l = (await signup(input, t0, dir))!;
    for (let i = 1; i < MAX_CODE_TRIES; i++) expect(await redeemCode(input.email, wrong(l.code), t0, dir)).toBeNull();
    // Still usable after one try less than the limit …
    expect(await redeemCode(input.email, l.code, t0, dir)).not.toBeNull();

    const login = (await requestLogin(input.email, later(RESEND_GAP_MS + 1), dir))!;
    for (let i = 0; i < MAX_CODE_TRIES; i++) await redeemCode(input.email, wrong(login.code), t0, dir);
    // … but not after the limit, and the link is gone as well.
    expect(await redeemCode(input.email, login.code, t0, dir)).toBeNull();
    expect(await redeem(login.token, t0, dir)).toBeNull();
  });
});

describe("sharing a budget", () => {
  const confirmed = async () => {
    const l = (await signup(input, t0, dir))!;
    await redeem(l.token, t0, dir);
    return l.account.id;
  };
  const bo = { firstName: "Bo", email: "Bo@Eksempel.dk" };

  it("invites a member who logs in to the same budget with their own e-mail and code", async () => {
    const id = await confirmed();
    const r = await addMember(id, bo, t0, dir);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.link.purpose).toBe("invite");
    expect(r.link.to).toEqual({ email: "bo@eksempel.dk", firstName: "Bo" });
    expect(listLogins((await readAccount(id, dir))!).members).toEqual([
      { id: r.link.member!.id, name: "Bo", email: "bo@eksempel.dk", pending: true },
    ]);

    const accepted = (await redeem(r.link.token, later(1000), dir))!;
    expect(accepted.account.id).toBe(id);
    expect(accepted.member?.verifiedAt).toBe(later(1000).toISOString());
    expect(await redeem(r.link.token, later(2000), dir)).toBeNull();

    // Later logins mail a code to the member, not to the primary.
    const login = (await requestLogin("bo@eksempel.dk", later(RESEND_GAP_MS + 1), dir))!;
    expect(login.to.email).toBe("bo@eksempel.dk");
    expect(login.purpose).toBe("login");
    const viaCode = (await redeemCode("bo@eksempel.dk", login.code, later(RESEND_GAP_MS + 2), dir))!;
    expect(viaCode.account.id).toBe(id);
    expect(viaCode.member?.id).toBe(r.link.member!.id);
    // The primary's own login is untouched.
    expect((await readAccount(id, dir))?.token).toBeUndefined();
    expect(await readProfile(id, dir)).toEqual({ email: "anna@eksempel.dk", phone: "+4512345678" });
  });

  it(`allows at most ${MAX_LOGINS} e-mails and each e-mail on one budget only`, async () => {
    const id = await confirmed();
    expect(await addMember(id, { firstName: "Anna", email: input.email }, t0, dir)).toEqual({ ok: false, error: "taken" });
    expect((await addMember(id, bo, t0, dir)).ok).toBe(true);
    expect(await addMember(id, bo, t0, dir)).toEqual({ ok: false, error: "taken" });
    expect((await addMember(id, { firstName: "Cia", email: "cia@eksempel.dk" }, t0, dir)).ok).toBe(true);
    expect(await addMember(id, { firstName: "Dan", email: "dan@eksempel.dk" }, t0, dir)).toEqual({ ok: false, error: "full" });
    expect(await addMember(id, { firstName: " ", email: "dan@eksempel.dk" }, t0, dir)).toEqual({ ok: false, error: "firstName" });
    expect(await addMember(id, { firstName: "Dan", email: "dan@" }, t0, dir)).toEqual({ ok: false, error: "email" });
    // Signing up with a member's e-mail makes no new account; it mails the member a login.
    const s = (await signup({ ...input, email: "bo@eksempel.dk" }, later(RESEND_GAP_MS + 1), dir))!;
    expect(s.account.id).toBe(id);
    expect(s.purpose).toBe("login");
    expect((await readdir(path.join(dir, "accounts"))).length).toBe(1);
  });

  it("stops a removed member's links and codes", async () => {
    const id = await confirmed();
    const r = (await addMember(id, bo, t0, dir)) as { ok: true; link: { token: string; member?: { id: string } } };
    expect(await removeMember(id, r.link.member!.id, dir)).toBe(true);
    expect(await removeMember(id, r.link.member!.id, dir)).toBe(false);
    expect(await redeem(r.link.token, t0, dir)).toBeNull();
    expect(await requestLogin("bo@eksempel.dk", t0, dir)).toBeNull();
    expect((await readAccount(id, dir))?.members).toBeUndefined();
  });
});
