import type { Metadata } from "next";
import { Wordmark } from "@/components/Logo";
import { findGrant, formatCode, normalizeCode } from "@/lib/agreements";
import { today } from "@/lib/owner";
import { readLedger } from "@/lib/owner-store";
import "../../login/app.css";
import "../aftale.css";

export const metadata: Metadata = {
  title: "budgetpro – din adgang",
  robots: { index: false },
  // The code is in the URL: don't send it on to other sites.
  referrer: "no-referrer",
};

const months = (n: number) => `${n} ${n === 1 ? "måned" : "måneder"}`;
const danishDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
};

/**
 * Where the link in a seat mail lands (lib/agreement-mail.ts): says who gave the access and sends the person on –
 * a teacher to budgetpro Skole, a bank or estate-agent customer to sign up or log in, with the code along.
 * Looking at the page doesn't take the seat; that happens when the code is used after login.
 */
export default async function UseSeatPage({ searchParams }: { searchParams: Promise<{ kode?: string | string[] }> }) {
  const p = await searchParams;
  const code = normalizeCode(typeof p.kode === "string" ? p.kode : "");
  const grant = code ? await findGrant(code) : null;
  const org = grant ? (await readLedger()).orgs.find((o) => o.id === grant.org) : undefined;
  const shown = code ? formatCode(code) : "";

  let body;
  if (!grant || !org) {
    body = <p className="bx-muted">Koden passer ikke, eller den er trukket tilbage. Tjek linket i mailen, eller spørg den, der gav dig adgangen.</p>;
  } else if (grant.usedBy) {
    body = (
      <>
        <p className="bx-muted">Koden er allerede brugt. Log ind med den e-mail, du brugte dengang.</p>
        <a className="bx-btn bx-btn-primary bx-btn-lg" href={org.category === "skole" ? "/skole/laerer" : "/login"}>
          Log ind
        </a>
      </>
    );
  } else if (today() > grant.sendBy) {
    body = <p className="bx-muted">Koden skulle bruges senest den {danishDate(grant.sendBy)}. Spørg {org.name}, om du kan få en ny.</p>;
  } else if (org.category === "skole") {
    body = (
      <>
        <p className="bx-muted">
          {org.name} har givet dig en lærerplads på budgetpro Skole i {months(grant.months)}. Log ind eller opret dig med {grant.email}, så bliver pladsen din.
        </p>
        <a className="bx-btn bx-btn-primary bx-btn-lg" href={`/skole/laerer?kode=${shown}&email=${encodeURIComponent(grant.email)}`}>
          Gå til budgetpro Skole
        </a>
      </>
    );
  } else {
    body = (
      <>
        <p className="bx-muted">
          {org.name} har givet dig budgetpro i {months(grant.months)} uden betaling. Perioden starter, når du har oprettet dig og brugt koden. {org.name} kan ikke se dit budget.
        </p>
        <a className="bx-btn bx-btn-primary bx-btn-lg" href={`/opret?kode=${shown}&email=${encodeURIComponent(grant.email)}`}>
          Opret konto
        </a>
        <a className="bx-btn" href={`/login?kode=${shown}`}>
          Jeg har allerede en konto
        </a>
      </>
    );
  }

  return (
    <div className="bx af-login">
      <main className="bx-card af-login-card">
        <Wordmark fontSize={23} dark />
        <h1>{org && grant && !grant.usedBy ? `Din adgang fra ${org.name}` : "Din adgang til budgetpro"}</h1>
        {body}
      </main>
    </div>
  );
}
