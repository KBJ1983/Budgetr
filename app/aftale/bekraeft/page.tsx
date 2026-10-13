import type { Metadata } from "next";
import { AgreementRedeem } from "@/components/aftale/AgreementRedeem";
import "../../login/app.css";
import "../aftale.css";

export const metadata: Metadata = {
  title: "budgetpro – log ind",
  robots: { index: false },
  // The token is in the URL: don't send it on to other sites.
  referrer: "no-referrer",
};

export default async function AgreementRedeemPage({ searchParams }: { searchParams: Promise<{ t?: string | string[] }> }) {
  const p = await searchParams;
  return <AgreementRedeem token={typeof p.t === "string" ? p.t.slice(0, 200) : undefined} />;
}
