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
];

export function findUser(login: string): TestUser | undefined {
  const key = login.trim().toLowerCase();
  if (!key) return undefined;
  return USERS.find((u) => u.logins.some((l) => l.toLowerCase() === key));
}

export const userById = (id: string | null | undefined) => USERS.find((u) => u.id === id);
