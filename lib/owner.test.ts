import { describe, expect, it } from "vitest";
import type { Account } from "./accounts";
import { applyChange, buildOverview, chargeIn, emptyLedger, findSchoolAgreements, listPrice, type Ledger, type Org } from "./owner";

const now = new Date("2026-10-07T10:00:00Z");

const account = (id: string, createdAt: string, extra: Partial<Account> = {}): Account => ({
  id,
  firstName: "Navn",
  lastName: id,
  email: `${id}@eksempel.dk`,
  phone: "+4512345678",
  createdAt,
  verifiedAt: createdAt,
  ...extra,
});

describe("chargeIn", () => {
  it("charges a monthly plan on the start day, clamped to short months, until it ends", () => {
    const p = { interval: "monthly" as const, start: "2026-01-31", end: "2026-04-15" };
    expect(chargeIn(p, 2025, 11)).toBeNull();
    expect(chargeIn(p, 2026, 0)).toBe("2026-01-31");
    expect(chargeIn(p, 2026, 1)).toBe("2026-02-28");
    expect(chargeIn(p, 2026, 2)).toBe("2026-03-31");
    expect(chargeIn(p, 2026, 3)).toBeNull();
  });

  it("charges a yearly plan once a year and a one-off once", () => {
    const y = { interval: "yearly" as const, start: "2025-11-03" };
    expect(chargeIn(y, 2026, 10)).toBe("2026-11-03");
    expect(chargeIn(y, 2026, 9)).toBeNull();
    expect(chargeIn({ interval: "once", start: "2026-11-20" }, 2026, 10)).toBe("2026-11-20");
    expect(chargeIn({ interval: "once", start: "2026-11-20" }, 2027, 10)).toBeNull();
  });
});

describe("buildOverview", () => {
  const accounts = [
    account("u-aaaaaaaaaaaa", "2026-01-10T09:00:00Z", {
      members: [
        { id: "m-aaaaaaaa", firstName: "B", email: "b@eksempel.dk", invitedAt: "2026-02-01T00:00:00Z", verifiedAt: "2026-02-01T00:00:00Z" },
      ],
    }),
    account("u-bbbbbbbbbbbb", "2026-09-20T09:00:00Z"), // in the trial until 20 Oct
    account("u-cccccccccccc", "2026-03-01T09:00:00Z"), // bank user
    account("u-dddddddddddd", "2026-10-01T09:00:00Z", { verifiedAt: undefined }),
  ];
  const ledger: Ledger = {
    orgs: [{ id: "o-bank", name: "Banken", category: "bank", plan: { interval: "yearly", price: 12000, start: "2026-03-15", end: "2027-03-15" } }],
    expenses: [
      { id: "x-1", name: "Hosting", amount: 200, interval: "monthly", start: "2026-01-01" },
      { id: "x-2", name: "Domæne", amount: 150, interval: "yearly", start: "2025-11-10" },
    ],
    accounts: {
      "u-aaaaaaaaaaaa": { plan: { interval: "monthly", price: 38, start: "2026-02-09", end: "2026-11-20" } },
      "u-cccccccccccc": { org: "o-bank" },
    },
  };
  const activity = {
    "u-aaaaaaaaaaaa": { "u-aaaaaaaaaaaa": "2026-10-05T08:00:00Z", "m-aaaaaaaa": "2026-08-01T08:00:00Z" },
    "u-cccccccccccc": { "u-cccccccccccc": "2026-09-20T08:00:00Z" },
  };
  const o = buildOverview(accounts, ledger, activity, now);

  it("counts users, active users and paying users", () => {
    expect(o.users).toEqual({ logins: 4, budgets: 3, unconfirmed: 1 });
    expect(o.active).toEqual({ d30: 2, d7: 1 });
    expect(o.paying).toEqual({ logins: 3, customers: 2, trial: 1 });
    expect(o.mrr).toBe(1038);
  });

  it("forecasts next month: renewals, plans that end, trials that end and expenses", () => {
    expect(o.nextMonth).toBe("november 2026");
    expect(o.next.renewals.map((l) => [l.who, l.date, l.amount])).toEqual([["Navn u-aaaaaaaaaaaa", "2026-11-09", 38]]);
    expect(o.next.ending.map((l) => [l.date, l.amount])).toEqual([["2026-11-20", 38]]);
    expect(o.next.trialsEnding).toEqual([]);
    expect(o.next.expenses).toBe(350);
    expect(o.months[4]).toEqual({ label: "marts 2027", revenue: 0, expenses: 200 });
  });

  it("splits customers into categories", () => {
    const by = Object.fromEntries(o.categories.map((c) => [c.id, c]));
    expect(by.bank).toMatchObject({ customers: 1, payingCustomers: 1, logins: 1, active: 1, paying: 1, mrr: 1000 });
    expect(by.privat).toMatchObject({ customers: 2, payingCustomers: 1, logins: 3, active: 1, paying: 2, mrr: 38, nextMonth: 38 });
    expect(by.skole).toMatchObject({ customers: 0, logins: 0, mrr: 0 });
    expect(o.customers.find((c) => c.id === "u-bbbbbbbbbbbb")).toMatchObject({ status: "trial", trialEnds: "2026-10-20" });
    expect(o.customers.find((c) => c.id === "u-cccccccccccc")).toMatchObject({ category: "bank", status: "paying", lastSeen: "2026-09-20T08:00:00Z" });
  });

  it("counts seat packs: seats sent and used, the sale as one-off revenue, and the agreement as paying while it can send", () => {
    const withPacks: Ledger = {
      ...emptyLedger(),
      orgs: [
        {
          id: "o-skole",
          name: "Skolen",
          category: "skole",
          packs: [
            { id: "p-new", count: 20, months: 12, bought: "2026-11-02", sendBy: "2027-11-02", price: 4000 },
            { id: "p-old", count: 10, months: 12, bought: "2026-08-01", sendBy: "2027-08-01" },
          ],
        },
        { id: "o-gl", name: "Gammel", category: "maegler", packs: [{ id: "p-gl", count: 5, months: 3, bought: "2025-01-01", sendBy: "2026-01-01" }] },
      ],
    };
    const v = buildOverview([], withPacks, {}, now, { "p-old": { sent: 6, used: 4 } });
    const skole = v.orgs.find((x) => x.id === "o-skole")!;
    expect(skole.packs.map((p) => [p.id, p.sent, p.used])).toEqual([["p-old", 6, 4], ["p-new", 0, 0]]);
    expect(skole.seatsBought).toEqual({ count: 30, sent: 6, used: 4 });
    expect(skole.status).toBe("paying");
    expect(v.orgs.find((x) => x.id === "o-gl")!.status).toBe("ended");
    expect(v.next.renewals.map((l) => [l.who, l.date, l.amount])).toEqual([["Skolen", "2026-11-02", 4000]]);
    expect(v.categories.find((c) => c.id === "skole")).toMatchObject({ customers: 1, payingCustomers: 1, mrr: 0, nextMonth: 4000 });
  });
});

describe("applyChange", () => {
  const ids = ["u-aaaaaaaaaaaa"];

  it("sets and removes an account's plan", () => {
    const r = applyChange(emptyLedger(), { type: "account", id: ids[0], plan: { interval: "monthly", price: "29,00", start: "2026-11-01" } }, ids);
    expect(r.ok && r.ledger.accounts[ids[0]!]).toEqual({ plan: { interval: "monthly", price: 29, start: "2026-11-01" } });
    const back = r.ok && applyChange(r.ledger, { type: "account", id: ids[0], plan: null }, ids);
    expect(back && back.ok && back.ledger.accounts).toEqual({});
  });

  it("refuses unknown accounts, bad plans and nameless organisations", () => {
    expect(applyChange(emptyLedger(), { type: "account", id: "u-zzzzzzzzzzzz", plan: null }, ids)).toEqual({ ok: false, error: "account" });
    expect(applyChange(emptyLedger(), { type: "account", id: ids[0], plan: { interval: "monthly", price: 29, start: "2026-11-01", end: "2026-10-01" } }, ids)).toEqual({ ok: false, error: "plan" });
    expect(applyChange(emptyLedger(), { type: "org", org: { name: " ", category: "bank" } }, ids)).toEqual({ ok: false, error: "name" });
    expect(applyChange(emptyLedger(), { type: "nope" }, ids)).toEqual({ ok: false, error: "type" });
  });

  it("adds an organisation, links an account and unlinks it when the organisation is deleted", () => {
    const a = applyChange(emptyLedger(), { type: "org", org: { name: "Skolen", category: "skole", seats: "40", plan: null } }, ids);
    if (!a.ok) throw new Error(a.error);
    const org = a.ledger.orgs[0]!;
    expect(org).toMatchObject({ name: "Skolen", category: "skole", seats: 40 });
    const b = applyChange(a.ledger, { type: "account", id: ids[0], org: org.id }, ids);
    if (!b.ok) throw new Error(b.error);
    expect(b.ledger.accounts[ids[0]!]).toEqual({ org: org.id });
    const c = applyChange(b.ledger, { type: "deleteOrg", id: org.id }, ids);
    expect(c.ok && c.ledger).toEqual(emptyLedger());
  });

  it("adds, edits and deletes an expense", () => {
    const a = applyChange(emptyLedger(), { type: "expense", expense: { name: "Hosting", amount: "199,5", interval: "monthly", start: "2026-10-01" } }, ids);
    if (!a.ok) throw new Error(a.error);
    const id = a.ledger.expenses[0]!.id;
    const b = applyChange(a.ledger, { type: "expense", expense: { id, name: "Hosting", amount: 250, interval: "monthly", start: "2026-10-01" } }, ids);
    expect(b.ok && b.ledger.expenses).toEqual([{ id, name: "Hosting", amount: 250, interval: "monthly", start: "2026-10-01" }]);
    const c = b.ok && applyChange(b.ledger, { type: "deleteExpense", id }, ids);
    expect(c && c.ok && c.ledger.expenses).toEqual([]);
  });

  it("keeps kundeadmins as clean e-mails, max five, and keeps them and the packs when the agreement is edited", () => {
    const a = applyChange(emptyLedger(), { type: "org", org: { name: "Banken", category: "bank", admins: " Anna@Banken.dk,\nbo@banken.dk anna@banken.dk" } }, ids);
    if (!a.ok) throw new Error(a.error);
    const id = a.ledger.orgs[0]!.id;
    expect(a.ledger.orgs[0]!.admins).toEqual(["anna@banken.dk", "bo@banken.dk"]);
    const p = applyChange(a.ledger, { type: "pack", org: id, pack: { count: "50", months: "3", bought: "2026-10-13", price: "2500" } }, ids);
    if (!p.ok) throw new Error(p.error);
    const b = applyChange(p.ledger, { type: "org", org: { id, name: "Banken A/S", category: "bank" } }, ids);
    expect(b.ok && b.ledger.orgs[0]).toMatchObject({ name: "Banken A/S", admins: ["anna@banken.dk", "bo@banken.dk"], packs: [{ count: 50 }] });
    expect(applyChange(a.ledger, { type: "org", org: { id, name: "B", category: "bank", admins: "ikke-en-mail" } }, ids)).toEqual({ ok: false, error: "admins" });
    const six = Array.from({ length: 6 }, (_, i) => `a${i}@b.dk`);
    expect(applyChange(a.ledger, { type: "org", org: { id, name: "B", category: "bank", admins: six } }, ids)).toEqual({ ok: false, error: "admins" });
  });

  it("adds a pack (send-by defaults to a year), and won't shrink or delete what is already sent", () => {
    const a = applyChange(emptyLedger(), { type: "org", org: { name: "Mægleren", category: "maegler" } }, ids);
    if (!a.ok) throw new Error(a.error);
    const org = a.ledger.orgs[0]!.id;
    const b = applyChange(a.ledger, { type: "pack", org, pack: { count: 10, months: 3, bought: "2026-01-31" } }, ids);
    if (!b.ok) throw new Error(b.error);
    const pack = b.ledger.orgs[0]!.packs![0]!;
    expect(pack).toMatchObject({ count: 10, months: 3, bought: "2026-01-31", sendBy: "2027-01-31" });
    expect(pack.price).toBeUndefined();
    const use = { [pack.id]: { sent: 4, used: 1 } };
    expect(applyChange(b.ledger, { type: "pack", org, pack: { ...pack, count: 3 } }, ids, use)).toEqual({ ok: false, error: "fewer" });
    expect(applyChange(b.ledger, { type: "pack", org, pack: { ...pack, count: 4 } }, ids, use).ok).toBe(true);
    expect(applyChange(b.ledger, { type: "deletePack", org, id: pack.id }, ids, use)).toEqual({ ok: false, error: "inUse" });
    expect(applyChange(b.ledger, { type: "deleteOrg", id: org }, ids, use)).toEqual({ ok: false, error: "inUse" });
    const c = applyChange(b.ledger, { type: "deletePack", org, id: pack.id }, ids);
    expect(c.ok && c.ledger.orgs[0]!.packs).toBeUndefined();
    expect(applyChange(a.ledger, { type: "pack", org, pack: { count: 0, months: 3, bought: "2026-01-31" } }, ids)).toEqual({ ok: false, error: "count" });
    expect(applyChange(a.ledger, { type: "pack", org, pack: { count: 5, months: 61, bought: "2026-01-31" } }, ids)).toEqual({ ok: false, error: "months" });
    expect(applyChange(a.ledger, { type: "pack", org, pack: { count: 5, months: 3, bought: "2026-01-31", sendBy: "2026-01-01" } }, ids)).toEqual({ ok: false, error: "sendBy" });
  });

  it("follows the landing page's price list", () => {
    expect(listPrice("monthly", 1)).toBe(29);
    expect(listPrice("monthly", 3)).toBe(47);
    expect(listPrice("yearly", 2)).toBe(388);
  });
});

describe("findSchoolAgreements", () => {
  const pack = { id: "p-1", count: 10, months: 12, bought: "2026-08-01", sendBy: "2027-08-01" };
  const orgs: Org[] = [
    { id: "o-1", name: "Hasle Skole", category: "skole", packs: [pack] },
    { id: "o-2", name: "Lystrup Skole", category: "skole", packs: [{ ...pack, id: "p-2", sendBy: "2026-09-01" }] },
    { id: "o-3", name: "Hasle Bank", category: "bank", packs: [{ ...pack, id: "p-3" }] },
    { id: "o-4", name: "Vestre Skole", category: "skole", plan: { interval: "yearly", price: 1000, start: "2026-01-01" } },
  ];
  const day = "2026-10-13";

  it("finds an active school however the name is written", () => {
    expect(findSchoolAgreements(orgs, "hasle skole.", day)).toEqual(["Hasle Skole"]);
    expect(findSchoolAgreements(orgs, "Hasle-skolen", day)).toEqual(["Hasle Skole"]);
    expect(findSchoolAgreements(orgs, "Hasle Skole, Aarhus", day)).toEqual(["Hasle Skole"]);
    expect(findSchoolAgreements(orgs, "Vestre", day)).toEqual(["Vestre Skole"]);
  });

  it("leaves out ended agreements, other kinds and short words", () => {
    expect(findSchoolAgreements(orgs, "Lystrup Skole", day)).toEqual([]);
    expect(findSchoolAgreements(orgs, "Skole", day)).toEqual([]);
    expect(findSchoolAgreements(orgs, "Ha", day)).toEqual([]);
  });
});
