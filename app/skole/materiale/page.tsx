import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Material } from "@/components/skole/Material";
import { TEACHER_COOKIE } from "@/lib/session";
import { currentTeacher } from "@/lib/skole-auth";

export const metadata: Metadata = {
  title: "budgetpro Skole – undervisningsmateriale",
  description: "Forløbsbeskrivelse, lærervejledning og elevark til de fire lektioner i budgetpro Skole, klar til print.",
};

// The material for anyone: the course description, the teacher's pages and blank worksheets. With codes on: the class page.
export default async function MaterialPage() {
  const t = await currentTeacher((await cookies()).get(TEACHER_COOKIE)?.value);
  return <Material teacher={t?.name ?? null} />;
}
