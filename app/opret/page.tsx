import type { Metadata } from "next";
import { CreateAccountForm } from "@/components/app/CreateAccountForm";
import "../login/app.css";

export const metadata: Metadata = { title: "budgetpro – opret konto", robots: { index: false } };

type Params = { email?: string | string[] };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  return <CreateAccountForm email={typeof p.email === "string" ? p.email.slice(0, 200) : undefined} />;
}
