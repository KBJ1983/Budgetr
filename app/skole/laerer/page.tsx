import type { Metadata } from "next";
import { cookies } from "next/headers";
import { TeacherHome } from "@/components/skole/TeacherHome";
import { TeacherLogin } from "@/components/skole/TeacherLogin";
import { TEACHER_COOKIE } from "@/lib/session";
import { currentTeacher } from "@/lib/skole-auth";
import { teacherClasses } from "@/lib/skole-store";

export const metadata: Metadata = { title: "budgetpro Skole – lærer" };

// Logged in: the teacher's classes. Otherwise: log in or sign up.
export default async function TeacherPage() {
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  if (!t) return <TeacherLogin />;
  return <TeacherHome name={t.name} school={t.school} initial={await teacherClasses(t.id)} />;
}
