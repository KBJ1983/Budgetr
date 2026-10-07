/**
 * The owner overview's storage and access (the numbers themselves are in lib/owner.ts):
 *
 *   owner/ledger.json      plans, organisations and expenses kept by hand on /ejer
 *   activity/<id>.json     { <holder id>: ISO time } – when the primary (account id) or a member (m-…) last
 *                          loaded or saved the budget; written at most once per ACTIVITY_GAP_MS per holder
 *
 * in the store (lib/kv.ts). Only the owner may see or change any of this: a real account (or member) whose e-mail
 * is in OWNER_EMAILS (comma-separated); in development the page is open, like the test-user shortcuts.
 */
import { readAccount, type Account } from "./accounts";
import { openStore } from "./kv";
import { buildOverview, emptyLedger, type Activity, type Ledger, type Overview } from "./owner";
import { readSession } from "./session";
import { normalizeEmail } from "./signup";
import { isAccountId } from "./users";

export const ACTIVITY_GAP_MS = 60 * 60 * 1000;

const LEDGER = "owner/ledger.json";

export async function readLedger(dir?: string): Promise<Ledger> {
  try {
    const x = JSON.parse((await openStore(dir).get(LEDGER)) ?? "null");
    if (!x || typeof x !== "object") return emptyLedger();
    return {
      orgs: Array.isArray(x.orgs) ? x.orgs : [],
      expenses: Array.isArray(x.expenses) ? x.expenses : [],
      accounts: x.accounts && typeof x.accounts === "object" ? x.accounts : {},
    };
  } catch {
    return emptyLedger();
  }
}

export async function writeLedger(ledger: Ledger, dir?: string): Promise<void> {
  await openStore(dir).set(LEDGER, JSON.stringify(ledger, null, 1));
}

/** Notes that a login used its budget (holder = the account id, or the member id). */
export async function touchActivity(userId: string, holder: string, now = new Date(), dir?: string): Promise<void> {
  if (!isAccountId(userId)) return;
  const store = openStore(dir);
  const key = `activity/${userId}.json`;
  let seen: Record<string, string> = {};
  try {
    seen = JSON.parse((await store.get(key)) ?? "{}") ?? {};
  } catch {}
  const last = seen[holder];
  if (last && now.getTime() - Date.parse(last) < ACTIVITY_GAP_MS) return;
  seen[holder] = now.toISOString();
  await store.set(key, JSON.stringify(seen));
}

export async function readActivity(ids: string[], dir?: string): Promise<Activity> {
  const store = openStore(dir);
  const out: Activity = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const x = JSON.parse((await store.get(`activity/${id}.json`)) ?? "null");
        if (x && typeof x === "object") out[id] = x;
      } catch {}
    }),
  );
  return out;
}

export async function listAccounts(dir?: string): Promise<Account[]> {
  const names = (await openStore(dir).list("accounts")).filter((n) => n.endsWith(".json"));
  const all = await Promise.all(names.map((n) => readAccount(n.slice(0, -5), dir)));
  return all.filter((a): a is Account => !!a);
}

export async function loadOverview(now = new Date(), dir?: string): Promise<Overview> {
  const accounts = await listAccounts(dir);
  const [ledger, activity] = await Promise.all([readLedger(dir), readActivity(accounts.map((a) => a.id), dir)]);
  return buildOverview(accounts, ledger, activity, now);
}

// ---- Access ------------------------------------------------------------------------------------------------------

export const ownerEmails = () =>
  (process.env.OWNER_EMAILS ?? "").split(",").map(normalizeEmail).filter(Boolean);

/**
 * May this request see the owner page? In development always (like the test users); otherwise only a session of a
 * confirmed account – or member – whose e-mail is in OWNER_EMAILS.
 */
export async function isOwner(cookie: string | undefined, now = new Date(), dir?: string, dev = process.env.NODE_ENV !== "production") {
  if (dev) return true;
  const owners = ownerEmails();
  const s = owners.length ? await readSession(cookie, now, dir) : null;
  if (!s) return false;
  const a = await readAccount(s.user, dir);
  if (!a?.verifiedAt) return false;
  const email = s.member ? a.members?.find((m) => m.id === s.member && m.verifiedAt)?.email : a.email;
  return !!email && owners.includes(email);
}
