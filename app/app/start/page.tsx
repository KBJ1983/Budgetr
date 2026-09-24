import type { Metadata } from "next";
import { Guide } from "@/components/app/Guide";

export const metadata: Metadata = { title: "budgetr – opret dit budget" };

export default async function StartPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const { email } = await searchParams;
  return <Guide email={typeof email === "string" ? email.slice(0, 200) : undefined} />;
}
