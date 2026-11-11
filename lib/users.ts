/**
 * Test users while budgetr is being tested. There are no passwords: typing a user's login
 * (initials or e-mail, case-insensitive) switches to that user. Real accounts with e-mail
 * and login replace this later.
 *
 * To add a user: append a line. A new user starts in the app's guide, unless a git-ignored
 * file public/private/<id>.legacy.json exists with their real budget (then that is loaded once).
 * Never put real e-mail addresses here – the repo is public.
 */
export interface TestUser {
  id: string;
  /** What the user types to log in. Matched case-insensitively. */
  logins: string[];
  name: string;
}

export const USERS: TestUser[] = [
  { id: "kbj", logins: ["KBJ"], name: "KBJ" },
  { id: "test1", logins: ["TEST1"], name: "TEST1" },
  { id: "test2", logins: ["TEST2"], name: "TEST2" },
  { id: "test3", logins: ["TEST3"], name: "TEST3" },
  { id: "test4", logins: ["TEST4"], name: "TEST4" },
  { id: "test5", logins: ["TEST5"], name: "TEST5" },
  // Always starts over in the app's guide (the prelude in public/budgetr-app/index.html ignores saved copies).
  { id: "guide", logins: ["GUIDE"], name: "GUIDE" },
  // Fictional demo customer (lib/demo-customer.ts); /demobruger resets it and logs in.
  { id: "demo", logins: ["DEMO"], name: "DEMO" },
];

export function findUser(login: string): TestUser | undefined {
  const key = login.trim().toLowerCase();
  if (!key) return undefined;
  return USERS.find((u) => u.logins.some((l) => l.toLowerCase() === key));
}

export const userById = (id: string | null | undefined) => USERS.find((u) => u.id === id);

/** The fictional demo customer is open to everyone, also on the live site. */
export const DEMO_ID = "demo";

/**
 * Test logins (KBJ, TEST1–5, GUIDE and the test teachers) have no password, so they only work while the site is
 * closed: in development, behind SITE_PASSWORD (the test period), or when TEST_USERS=1 is set on purpose. When the
 * password is removed at launch they close by themselves; their saved data is left as it is. Server-side only.
 */
export const testUsersOpen = () =>
  process.env.NODE_ENV !== "production" || !!process.env.SITE_PASSWORD || process.env.TEST_USERS === "1";

/** Real accounts (lib/accounts.ts) have ids like "u-k3x9…", so they never clash with a test user or a data/ file. */
export const isAccountId = (id: unknown): id is string => typeof id === "string" && /^u-[a-z0-9]{12}$/.test(id);
