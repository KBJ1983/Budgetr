import Link from "next/link";
import styles from "@/components/landing/landing.module.css";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { BRAND, Logo } from "@/components/Logo";
import { companyIsDraft } from "@/lib/company";
import legal from "./legal.module.css";

const FOOTER_LINKS = [
  { href: "/", label: "Forside" },
  { href: "/erhverv", label: "Erhverv" },
  { href: "/skole", label: "Skole" },
];

/**
 * Frame for the legal pages (/privatliv, /vilkaar, also served under /skole/…): a quiet header with the logo, one
 * readable column with the title and date, and the site footer. Colours from the landing palette (`.page`).
 */
export function LegalShell({ title, updated, lead, children }: { title: string; updated: string; lead: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={legal.top}>
        <div className={legal.topInner}>
          <Link href="/" aria-label="budgetpro forside">
            <Logo fontSize={22} bg={BRAND.paper} />
          </Link>
          <Link href="/" className={legal.back}>
            Til forsiden
          </Link>
        </div>
      </header>
      <main className={legal.doc}>
        <h1>{title}</h1>
        <p className={legal.updated}>Senest opdateret {updated}</p>
        {companyIsDraft && (
          <p className={legal.draft} role="note">
            Udkast: firmaoplysningerne er ikke udfyldt endnu.
          </p>
        )}
        <p className={legal.lead}>{lead}</p>
        {children}
      </main>
      <SiteFooter links={FOOTER_LINKS} />
    </div>
  );
}
