import { describe, expect, it } from "vitest";
import type { Account } from "./accounts";
import { applyChange, buildOverview, chargeIn, emptyLedger, listPrice, type Ledger } from "./owner";

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

  it("follows the landing page's price list", () => {
    expect(listPrice("monthly", 1)).toBe(29);
    expect(listPrice("monthly", 3)).toBe(47);
    expect(listPrice("yearly", 2)).toBe(388);
  });
});
