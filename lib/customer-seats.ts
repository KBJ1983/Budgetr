/**
 * Seats for bank and estate-agent customers (step 4 of docs/plans/2026-10-13-aftaler-adgang.md). A kundeadmin sends a
 * seat to an e-mail (lib/agreements.ts); the customer takes it with the code from the mail – on /opret or /login (the
 * code rides along and is noted on the account until the e-mail is confirmed), or in the app under Indstillinger – or
 * at once on login, when a seat is waiting for that e-mail. Taking it links the account to the organisation in the
 * owner ledger with `until` (the first day without the seat), so /admin shows "Betalt af aftale" until then.
 *
 * There is no paywall yet: the seat decides who counts as an agreement customer and when the free period ends.
 */
import { readAccount, setPendingSeat, type Login } from "./accounts";
import { seatEndingMail } from "./agreement-mail";
import { findGrant, formatCode, grantCode, useCode, waitingGrant, type Grant } from "./agreements";
import { addDays, orgActive, PRICES, today, type Org } from "./owner";
import { readLedger, writeLedger } from "./owner-store";

export interface CustomerSeat {
  /** The organisation that gave the seat. */
  org: string;
  /** YYYY-MM-DD, the first day without the seat. */
  until: string;
}

export type CustomerSeatTaken = { ok: true; seat: CustomerSeat } | { ok: false; error: "unknown" | "used" | "expired" | "school" };

const forCustomers = (o: Org | undefined): o is Org => !!o && o.category !== "skole";

/** The account's seat while it lasts, or null. */
export async function customerSeat(accountId: string, now = new Date(), dir?: string): Promise<CustomerSeat | null> {
  const ledger = await readLedger(dir);
  const entry = ledger.accounts[accountId];
  const org = ledger.orgs.find((o) => o.id === entry?.org);
  if (!org || !entry?.until || today(now) >= entry.until) return null;
  return { org: org.name, until: entry.until };
}

/** What /opret and /login say about a code in their link: who gives the seat and for how long (null = nothing to say). */
export async function seatOffer(code: unknown, now = new Date(), dir?: string): Promise<{ code: string; org: string; months: number } | null> {
  const grant = await findGrant(code, dir);
  if (!grant || grant.usedBy || today(now) > grant.sendBy) return null;
  const org = (await readLedger(dir)).orgs.find((o) => o.id === grant.org);
  return forCustomers(org) ? { code: formatCode((await grantCode(grant.id, dir))), org: org.name, months: grant.months } : null;
}

/** Links the account to the grant's organisation until the seat ends. */
async function link(accountId: string, grant: Grant, org: Org, dir?: string): Promise<CustomerSeat> {
  const ledger = await readLedger(dir);
  ledger.accounts[accountId] = { ...ledger.accounts[accountId], org: org.id, until: grant.until! };
  await writeLedger(ledger, dir);
  return { org: org.name, until: grant.until! };
}

/** The account takes the seat behind a code. A school's code is refused, not spent (it is for a teacher). */
export async function takeCustomerSeat(accountId: string, code: unknown, now = new Date(), dir?: string): Promise<CustomerSeatTaken> {
  const grant = await findGrant(code, dir);
  if (!grant) return { ok: false, error: "unknown" };
  const org = (await readLedger(dir)).orgs.find((o) => o.id === grant.org);
  if (!org) return { ok: false, error: "unknown" };
  if (!forCustomers(org)) return { ok: false, error: "school" };
  const r = await useCode(code, accountId, now, dir);
  if (!r.ok) return r;
  return { ok: true, seat: await link(accountId, r.grant, org, dir) };
}

/**
 * Notes a code typed on /opret or /login on the account, so the seat is taken when the e-mail link or code is used –
 * also when the mail is opened on another device. Unknown and school codes are ignored.
 */
export async function noteSeatCode(accountId: string, code: unknown, dir?: string): Promise<void> {
  const grant = await findGrant(code, dir);
  if (!grant || grant.usedBy) return;
  const org = (await readLedger(dir)).orgs.find((o) => o.id === grant.org);
  if (forCustomers(org)) await setPendingSeat(accountId, { org: grant.org, grant: grant.id }, dir);
}

/** How many days before a seat ends its customer gets a mail about it. */
export const REMIND_DAYS = 7;

/**
 * Mails each customer whose seat ends within REMIND_DAYS (once per seat: the ledger notes `reminded`). Run once a day
 * (app/api/cron/aftaler, Vercel Cron). `send` returns false when no mail provider is set up; the seat is then not
 * noted, so it goes out once mail works. Returns how many were sent.
 */
export async function remindEndingSeats(
  send: (to: string, mail: { subject: string; text: string }) => Promise<boolean>,
  appUrl: string,
  now = new Date(),
  dir?: string,
): Promise<number> {
  const ledger = await readLedger(dir);
  const day = today(now), soon = addDays(day, REMIND_DAYS);
  let sent = 0;
  for (const [id, entry] of Object.entries(ledger.accounts)) {
    if (!entry.until || entry.reminded === entry.until || day >= entry.until || entry.until > soon) continue;
    const org = ledger.orgs.find((o) => o.id === entry.org);
    const account = await readAccount(id, dir);
    if (!forCustomers(org) || !account?.verifiedAt) continue;
    const mail = seatEndingMail({ firstName: account.firstName, orgName: org.name, lastDay: addDays(entry.until, -1), monthly: PRICES.monthly.base, appUrl });
    try {
      if (!(await send(account.email, mail))) continue;
    } catch (e) {
      console.error("[budgetr] seat reminder failed", e);
      continue;
    }
    entry.reminded = entry.until;
    sent++;
  }
  // Read again before writing, so a change made meanwhile (e.g. on /admin) isn't lost; only `reminded` is added.
  if (sent) {
    const fresh = await readLedger(dir);
    for (const [id, entry] of Object.entries(ledger.accounts)) {
      const f = fresh.accounts[id];
      if (entry.reminded && f && f.until === entry.reminded) f.reminded = entry.reminded;
    }
    await writeLedger(fresh, dir);
  }
  return sent;
}

/**
 * Right after a login: takes the seat noted on the account (or the code typed with the login), else a seat that is
 * waiting for the login's e-mail. Never fails the login – a seat that can't be taken is just left.
 */
export async function claimCustomerSeat(l: Login, typed?: unknown, now = new Date(), dir?: string): Promise<CustomerSeat | null> {
  try {
    const a = l.account;
    if (typed !== undefined) {
      const r = await takeCustomerSeat(a.id, typed, now, dir);
      if (r.ok) return r.seat;
    }
    if (a.pendingSeat) {
      const pending = a.pendingSeat;
      await setPendingSeat(a.id, null, dir);
      const r = await takeCustomerSeat(a.id, await grantCode(pending.grant, dir), now, dir);
      if (r.ok) return r.seat;
    }
    const day = today(now);
    const orgs = (await readLedger(dir)).orgs.filter((o) => forCustomers(o) && orgActive(o, day)).map((o) => o.id);
    if (!orgs.length) return null;
    const waiting = await waitingGrant(orgs, (l.member ?? a).email, now, dir);
    if (!waiting) return null;
    const r = await takeCustomerSeat(a.id, await grantCode(waiting.id, dir), now, dir);
    return r.ok ? r.seat : null;
  } catch (e) {
    console.error("[budgetr] customer seat failed", e);
    return null;
  }
}
