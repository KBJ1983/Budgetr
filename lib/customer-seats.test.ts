import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAccount, redeemCode, requestLogin, signup, type Login } from "./accounts";
import { giveAccess, readGrant } from "./agreements";
import { claimCustomerSeat, customerSeat, noteSeatCode, remindEndingSeats, seatOffer, takeCustomerSeat } from "./customer-seats";
import { buildOverview, emptyLedger, type Org } from "./owner";
import { readLedger, writeLedger } from "./owner-store";

const now = new Date("2026-11-02T10:00:00Z");

const bank: Org = { id: "o-bank", name: "Banken", category: "bank", admins: ["a@banken.dk"], packs: [{ id: "p-b", count: 3, months: 3, bought: "2026-10-01", sendBy: "2027-10-01" }] };
const school: Org = { id: "o-skole", name: "Eksempel Skole", category: "skole", admins: ["a@skole.dk"], packs: [{ id: "p-s", count: 2, months: 12, bought: "2026-10-01", sendBy: "2027-10-01" }] };

describe("customer seats", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-cseats-"));
    await writeLedger({ ...emptyLedger(), orgs: [bank, school] }, dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  /** Signs up and confirms with the mailed code, like /opret does; `kode` is sent along as on /opret?kode=…. */
  const confirmed = async (email: string, kode?: string): Promise<Login> => {
    const link = await signup({ firstName: "Kunde", lastName: "Test", email, phone: "+4512345678" }, now, dir);
    if (kode) await noteSeatCode(link!.account.id, kode, dir);
    return (await redeemCode(email, link!.code, now, dir))!;
  };
  const give = async (org: Org, email: string) => {
    const r = await giveAccess(org, email, now, dir);
    if (!r.ok) throw new Error(r.error);
    return r;
  };

  it("takes the seat with a code and links the account to the bank until the months are up", async () => {
    const l = await confirmed("kunde@eksempel.dk");
    const { code, grant } = await give(bank, "anden@eksempel.dk");
    expect(await takeCustomerSeat(l.account.id, code, now, dir)).toEqual({ ok: true, seat: { org: "Banken", until: "2027-02-02" } });
    expect((await readLedger(dir)).accounts[l.account.id]).toEqual({ org: "o-bank", until: "2027-02-02" });
    expect((await readGrant("o-bank", grant.id, dir))?.usedBy).toBe(l.account.id);
    expect(await customerSeat(l.account.id, now, dir)).toEqual({ org: "Banken", until: "2027-02-02" });
    expect(await customerSeat(l.account.id, new Date("2027-02-02T12:00:00Z"), dir)).toBeNull();
    // Once: another account can't take it, the same one may try again.
    const other = await confirmed("tredje@eksempel.dk");
    expect(await takeCustomerSeat(other.account.id, code, now, dir)).toEqual({ ok: false, error: "used" });
    expect((await takeCustomerSeat(l.account.id, code, now, dir)).ok).toBe(true);
  });

  it("refuses a school's code without spending it, and unknown codes", async () => {
    const l = await confirmed("kunde@eksempel.dk");
    const { code, grant } = await give(school, "laerer@eksempel.dk");
    expect(await takeCustomerSeat(l.account.id, code, now, dir)).toEqual({ ok: false, error: "school" });
    expect((await readGrant("o-skole", grant.id, dir))?.usedBy).toBeUndefined();
    expect(await takeCustomerSeat(l.account.id, "ABCD-EFGH", now, dir)).toEqual({ ok: false, error: "unknown" });
    expect(await seatOffer(code, now, dir)).toBeNull();
  });

  it("says who gives the seat on /opret, until it is used", async () => {
    const { code } = await give(bank, "kunde@eksempel.dk");
    const offer = await seatOffer(code.toLowerCase(), now, dir);
    expect(offer).toEqual({ code: `${code.slice(0, 4)}-${code.slice(4)}`, org: "Banken", months: 3 });
    await claimCustomerSeat(await confirmed("kunde@eksempel.dk"), undefined, now, dir);
    expect(await seatOffer(code, now, dir)).toBeNull();
  });

  it("takes a code noted at sign-up when the e-mail is confirmed, also for another e-mail", async () => {
    const { code } = await give(bank, "givet@eksempel.dk");
    const l = await confirmed("andenmail@eksempel.dk", code);
    expect((await readAccount(l.account.id, dir))?.pendingSeat).toBeDefined();
    expect(await claimCustomerSeat(l, undefined, now, dir)).toEqual({ org: "Banken", until: "2027-02-02" });
    expect((await readAccount(l.account.id, dir))?.pendingSeat).toBeUndefined();
  });

  it("takes a seat waiting for the e-mail on login, without a code", async () => {
    await give(bank, "kunde@eksempel.dk");
    const l = await confirmed("kunde@eksempel.dk");
    expect(await claimCustomerSeat(l, undefined, now, dir)).toEqual({ org: "Banken", until: "2027-02-02" });
    // A later login finds nothing new and keeps the seat.
    const again = await requestLogin("kunde@eksempel.dk", new Date(now.getTime() + 120_000), dir);
    const l2 = (await redeemCode("kunde@eksempel.dk", again!.code, new Date(now.getTime() + 120_000), dir))!;
    expect(await claimCustomerSeat(l2, undefined, now, dir)).toBeNull();
    expect(await customerSeat(l.account.id, now, dir)).toEqual({ org: "Banken", until: "2027-02-02" });
  });

  it("leaves a teacher's waiting seat for the teacher", async () => {
    await give(school, "laerer@eksempel.dk");
    expect(await claimCustomerSeat(await confirmed("laerer@eksempel.dk"), undefined, now, dir)).toBeNull();
  });

  it("shows the customer as paid by the agreement on /admin until the seat ends", async () => {
    const l = await confirmed("kunde@eksempel.dk");
    await takeCustomerSeat(l.account.id, (await give(bank, "kunde@eksempel.dk")).code, now, dir);
    const ledger = await readLedger(dir);
    const row = (at: Date) => buildOverview([(l.account)], ledger, {}, at).customers[0]!;
    expect(row(now)).toMatchObject({ status: "paying", seatUntil: "2027-02-02", org: { id: "o-bank", name: "Banken" } });
    expect(row(new Date("2027-02-03T12:00:00Z")).status).toBe("ended");
  });

  it("mails the customer once, a week before the seat ends", async () => {
    const l = await confirmed("kunde@eksempel.dk");
    await takeCustomerSeat(l.account.id, (await give(bank, "kunde@eksempel.dk")).code, now, dir); // until 2027-02-02
    const mails: { to: string; subject: string; text: string }[] = [];
    const send = async (to: string, m: { subject: string; text: string }) => (mails.push({ to, ...m }), true);
    const at = (d: string) => new Date(`${d}T08:00:00Z`);
    expect(await remindEndingSeats(send, "https://eksempel.dk/app", at("2027-01-25"), dir)).toBe(0);
    expect(await remindEndingSeats(send, "https://eksempel.dk/app", at("2027-01-26"), dir)).toBe(1);
    expect(mails[0]).toMatchObject({ to: "kunde@eksempel.dk", subject: "Din adgang til budgetpro fra Banken slutter den 1.2.2027" });
    expect(mails[0]!.text).toContain("29 kr om måneden inkl. moms");
    expect(mails[0]!.text).toContain("https://eksempel.dk/app");
    expect((await readLedger(dir)).accounts[l.account.id]).toMatchObject({ until: "2027-02-02", reminded: "2027-02-02" });
    // Once per seat; nothing after the seat has ended.
    expect(await remindEndingSeats(send, "https://eksempel.dk/app", at("2027-01-30"), dir)).toBe(0);
    expect(mails).toHaveLength(1);
  });

  it("keeps the reminder for later when no mail could go out", async () => {
    const l = await confirmed("kunde@eksempel.dk");
    await takeCustomerSeat(l.account.id, (await give(bank, "kunde@eksempel.dk")).code, now, dir);
    const day = new Date("2027-01-28T08:00:00Z");
    expect(await remindEndingSeats(async () => false, "https://eksempel.dk/app", day, dir)).toBe(0);
    expect((await readLedger(dir)).accounts[l.account.id]?.reminded).toBeUndefined();
    expect(await remindEndingSeats(async () => true, "https://eksempel.dk/app", day, dir)).toBe(1);
    expect(await remindEndingSeats(async () => true, "https://eksempel.dk/app", new Date("2027-02-02T08:00:00Z"), dir)).toBe(0);
  });
});
