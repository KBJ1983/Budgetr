import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AgreementHome } from "@/components/aftale/AgreementHome";
import { AgreementLogin } from "@/components/aftale/AgreementLogin";
import { loadAgreementView } from "@/lib/agreement-admins";
import { currentAgreement } from "@/lib/agreement-auth";
import { AGREEMENT_COOKIE } from "@/lib/session";
import "../login/app.css";
import "./aftale.css";

export const metadata: Metadata = { title: "budgetpro – aftale", robots: { index: false } };

type Params = { org?: string | string[]; email?: string | string[] };

/** Kundeadmins hand out their agreement's seats here (lib/agreement-admins.ts); everyone else sees the login. */
export default async function AgreementPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const who = await currentAgreement((await cookies()).get(AGREEMENT_COOKIE)?.value, typeof p.org === "string" ? p.org : null);
  if (!who) return <AgreementLogin email={typeof p.email === "string" ? p.email.slice(0, 200) : undefined} />;
  return <AgreementHome initial={await loadAgreementView(who.org, who.admin.email)} orgs={who.orgs.map((o) => ({ id: o.id, name: o.name }))} />;
}
