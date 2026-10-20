/**
 * Test teachers on budgetpro Skole, like the budget app's test users (lib/users.ts): typing LÆRER1–LÆRER5 (or LAERER1
 * …) where the e-mail goes on /skole/laerer logs in at once – no mail, no sign-up. They belong to the made-up
 * "Testskolen" and may make classes without a seat (lib/skole-seats.ts). Everyone who types the same login shares
 * that teacher's classes, so hand each tester their own. To add one, append to TEST_TEACHERS (the id must match
 * isTeacherId: "t-" + 10 characters).
 */
import { saveTeacher, readTeacher, type Teacher } from "./skole-teachers";

export interface TestTeacher {
  id: string;
  login: string;
  name: string;
}

export const TEST_SCHOOL = "Testskolen";

export const TEST_TEACHERS: TestTeacher[] = [1, 2, 3, 4, 5].map((n) => ({ id: `t-testlaer0${n}`, login: `LÆRER${n}`, name: `Testlærer ${n}` }));

/** "lærer1", " LAERER1 " and "Lærer 1" all find LÆRER1. */
const key = (s: string) => s.trim().toUpperCase().replace(/Æ/g, "AE").replace(/\s+/g, "");

export function findTestTeacher(login: unknown): TestTeacher | undefined {
  if (typeof login !== "string" || login.length > 40) return undefined;
  const k = key(login);
  return k ? TEST_TEACHERS.find((t) => key(t.login) === k) : undefined;
}

export const isTestTeacher = (id: string) => TEST_TEACHERS.some((t) => t.id === id);

/** The test teacher's saved record, made (confirmed, no e-mail index) on first login. */
export async function openTestTeacher(tt: TestTeacher, now = new Date(), dir?: string): Promise<Teacher> {
  const saved = await readTeacher(tt.id, dir);
  if (saved) return saved;
  const at = now.toISOString();
  const t: Teacher = { id: tt.id, name: tt.name, school: TEST_SCHOOL, email: `${tt.login.replace("Æ", "ae").toLowerCase()}@test.invalid`, createdAt: at, verifiedAt: at };
  await saveTeacher(t, dir);
  return t;
}
