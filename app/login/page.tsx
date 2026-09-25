import type { Metadata } from "next";
import { LoginForm } from "@/components/app/LoginForm";
import "../app/app.css";

export const metadata: Metadata = { title: "budgetr – log ind", robots: { index: false } };

type Params = { next?: string | string[]; email?: string | string[] };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 200) : undefined);

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  return <LoginForm next={one(p.next)} email={one(p.email)} />;
}
