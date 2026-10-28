import type { Metadata } from "next";
import { cookies } from "next/headers";
import { TeacherHome } from "@/components/skole/TeacherHome";
import { TeacherLogin } from "@/components/skole/TeacherLogin";
import { TEACHER_COOKIE } from "@/lib/session";
import { currentTeacher } from "@/lib/skole-auth";
import { canTryFree, claimWaitingSeat } from "@/lib/skole-seats";
import { teacherClasses } from "@/lib/skole-store";

export const metadata: Metadata = { title: "budgetpro Skole – lærer" };

type Params = { kode?: string | string[]; email?: string | string[]; ny?: string | string[] };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 200) : undefined);

// Logged in: the teacher's classes, and a seat from a school's agreement if one is waiting for the teacher's e-mail.
// Otherwise: log in or sign up (?ny=1 from "Opret en klasse" opens on sign-up). ?kode=…&email=… come from the link in
// a school's seat mail (via /aftale/brug).
export default async function TeacherPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  if (!t) return <TeacherLogin email={one(p.email)} start={p.ny ? "opret" : "login"} testHint={process.env.NODE_ENV === "development"} />;
  const seat = await claimWaitingSeat(t);
  return (
    <TeacherHome
      name={t.name}
      school={t.school}
      initial={await teacherClasses(t.id)}
      seat={seat}
      trial={canTryFree(t)}
      code={seat ? undefined : one(p.kode)}
    />
  );
}
