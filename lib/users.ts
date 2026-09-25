/**
 * Test users while budgetr is being tested. There are no passwords: typing a user's login
 * (initials or e-mail, case-insensitive) switches to that user. Real accounts with e-mail
 * and login replace this later.
 *
 * To add a user: append a line. `seed` decides what a new user starts with.
 */
export interface TestUser {
  id: string;
  /** What the user types to log in. Matched case-insensitively. */
  logins: string[];
  name: string;
  seed: "example" | "empty";
  /**
   * Git-ignored file under public/ with the user's real budget (made by `pnpm import:legacy`).
   * Loaded once on first login and replaces the example; if the file is missing, `seed` is used.
   */
  privateSeed?: string;
}

export const USERS: TestUser[] = [
  { id: "kbj", logins: ["KBJ"], name: "KBJ", seed: "example", privateSeed: "/private/kbj.json" },
  { id: "test1", logins: ["TEST1"], name: "TEST1", seed: "empty" },
  { id: "test2", logins: ["TEST2"], name: "TEST2", seed: "empty" },
  { id: "test3", logins: ["TEST3"], name: "TEST3", seed: "empty" },
  { id: "test4", logins: ["TEST4"], name: "TEST4", seed: "empty" },
  { id: "test5", logins: ["TEST5"], name: "TEST5", seed: "empty" },
];

export function findUser(login: string): TestUser | undefined {
  const key = login.trim().toLowerCase();
  if (!key) return undefined;
  return USERS.find((u) => u.logins.some((l) => l.toLowerCase() === key));
}

export const userById = (id: string | null | undefined) => USERS.find((u) => u.id === id);
