import type { Metadata } from "next";
import { StudentApp } from "@/components/skole/StudentApp";

export const metadata: Metadata = { title: "Elevkode – budgetpro Skole" };

export default function ElevPage() {
  return <StudentApp />;
}
