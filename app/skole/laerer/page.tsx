import type { Metadata } from "next";
import { TeacherCreate } from "@/components/skole/TeacherCreate";

export const metadata: Metadata = { title: "budgetpro Skole – opret klasse" };

export default function TeacherPage() {
  return <TeacherCreate />;
}
