import type { Metadata } from "next";
import { LoginForm } from "@/components/app/LoginForm";
import { seatOffer } from "@/lib/customer-seats";
import "./app.css";

export const metadata: Metadata = {
  title: "budgetpro – log ind",
  robots: { index: false },
  // A seat code may be in the URL: don't send it on to other sites.
  referrer: "no-referrer",
};

type Params = { next?: string | string[]; email?: string | string[]; kode?: string | string[] };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 200) : undefined);

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const seat = typeof p.kode === "string" ? await seatOffer(p.kode) : null;
  return <LoginForm next={one(p.next)} email={one(p.email)} seat={seat ?? undefined} testHint={process.env.NODE_ENV === "development"} />;
}
