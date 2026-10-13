import type { Metadata } from "next";
import { TeacherRedeem } from "@/components/skole/TeacherRedeem";

export const metadata: Metadata = {
  title: "budgetpro Skole – log ind",
  robots: { index: false },
  // The token is in the URL: don't send it on to other sites.
  referrer: "no-referrer",
};

export default async function TeacherRedeemPage({ searchParams }: PageProps<"/skole/laerer/bekraeft">) {
  const t = (await searchParams).t;
  return <TeacherRedeem token={typeof t === "string" ? t.slice(0, 200) : undefined} />;
}
