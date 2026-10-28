import type { Metadata } from "next";
import { CreateAccountForm } from "@/components/app/CreateAccountForm";
import { seatOffer } from "@/lib/customer-seats";
import "../login/app.css";

export const metadata: Metadata = {
  title: "budgetpro – opret konto",
  robots: { index: false },
  // A seat code may be in the URL: don't send it on to other sites.
  referrer: "no-referrer",
};

type Params = { email?: string | string[]; kode?: string | string[] };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const seat = typeof p.kode === "string" ? await seatOffer(p.kode) : null;
  return <CreateAccountForm email={typeof p.email === "string" ? p.email.slice(0, 200) : undefined} seat={seat ?? undefined} />;
}
