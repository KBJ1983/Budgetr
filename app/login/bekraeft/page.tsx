import type { Metadata } from "next";
import { RedeemLink } from "@/components/app/RedeemLink";
import "../app.css";

export const metadata: Metadata = {
  title: "budgetpro – bekræft",
  robots: { index: false },
  // The token is in the URL: don't send it on to other sites.
  referrer: "no-referrer",
};

type Params = { t?: string | string[]; ny?: string | string[]; inv?: string | string[] };

export default async function RedeemPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  return <RedeemLink token={typeof p.t === "string" ? p.t.slice(0, 200) : undefined} kind={p.ny === "1" ? "new" : p.inv === "1" ? "invite" : "login"} />;
}
