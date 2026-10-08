/**
 * The owner overview's storage and access (the numbers themselves are in lib/owner.ts):
 *
 *   owner/ledger.json      plans, organisations and expenses kept by hand on /admin
 *   activity/<id>.json     { <holder id>: ISO time } – when the primary (account id) or a member (m-…) last
 *                          loaded or saved the budget; written at most once per ACTIVITY_GAP_MS per holder
 *   owner/login-tries.json wrong owner passwords in the current window
 *
 * in the store (lib/kv.ts). Only the owner may see or change any of this: logged in on /admin with an e-mail from
 * OWNER_EMAILS (comma-separated) and the fixed ADMIN_PASSWORD – or with a mail login of an account whose e-mail is
 * in OWNER_EMAILS. In development without ADMIN_PASSWORD the page is open, like the test-user shortcuts.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { readAccount, type Account } from "./accounts";
import { openStore } from "./kv";
import { buildOverview, emptyLedger, type Activity, type Ledger, type Overview } from "./owner";
import { makeAdminSession, readAdminSession, readSession } from "./session";
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

/** The owner's fixed password (ADMIN_PASSWORD); shorter than this turns the password login off. */
export const MIN_ADMIN_PASSWORD = 12;
const adminPassword = () => {
  const p = process.env.ADMIN_PASSWORD ?? "";
  return p.length >= MIN_ADMIN_PASSWORD ? p : null;
};

/**
 * Open without login only in development without ADMIN_PASSWORD (set it to try the login locally). Otherwise the
 * owner's admin cookie (password login), or a mail-login session of an account – or member – whose e-mail is in
 * OWNER_EMAILS.
 */
export async function isOwner(
  cookies: { session?: string; admin?: string },
  now = new Date(),
  dir?: string,
  dev = process.env.NODE_ENV !== "production",
) {
  if (dev && !adminPassword()) return true;
  const owners = ownerEmails();
  if (!owners.length) return false;
  if (adminPassword() && (await readAdminSession(cookies.admin, now, dir))) return true;
  const s = await readSession(cookies.session, now, dir);
  if (!s) return false;
  const a = await readAccount(s.user, dir);
  if (!a?.verifiedAt) return false;
  const email = s.member ? a.members?.find((m) => m.id === s.member && m.verifiedAt)?.email : a.email;
  return !!email && owners.includes(email);
}

/** Wrong passwords allowed within LOCK_MS; then the login is closed until the window has passed. */
export const MAX_ADMIN_TRIES = 8;
export const LOCK_MS = 15 * 60 * 1000;
const TRIES = "owner/login-tries.json";

const sameText = (a: string, b: string) => {
  const x = createHash("sha256").update(a).digest(), y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

/**
 * The owner's password login: the e-mail must be in OWNER_EMAILS and the password match ADMIN_PASSWORD. Counts
 * wrong tries for everyone together (there is one owner), so the password can't be guessed by trying.
 */
export async function adminLogin(
  email: unknown,
  password: unknown,
  now = new Date(),
  dir?: string,
): Promise<{ ok: true; cookie: string } | { ok: false; error: "wrong" | "locked" | "off" }> {
  const want = adminPassword();
  if (!want || !ownerEmails().length) return { ok: false, error: "off" };
  const store = openStore(dir);
  let tries = { count: 0, first: 0 };
  try {
    tries = { ...tries, ...JSON.parse((await store.get(TRIES)) ?? "{}") };
  } catch {}
  if (now.getTime() - tries.first > LOCK_MS) tries = { count: 0, first: now.getTime() };
  if (tries.count >= MAX_ADMIN_TRIES) return { ok: false, error: "locked" };
  const okEmail = ownerEmails().includes(normalizeEmail(email));
  const okPassword = typeof password === "string" && sameText(password, want);
  if (!okEmail || !okPassword) {
    await store.set(TRIES, JSON.stringify({ count: tries.count + 1, first: tries.first || now.getTime() }));
    return { ok: false, error: tries.count + 1 >= MAX_ADMIN_TRIES ? "locked" : "wrong" };
  }
  await store.del(TRIES);
  return { ok: true, cookie: await makeAdminSession(now, dir) };
}
