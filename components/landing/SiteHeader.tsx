import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import styles from "./landing.module.css";
import { MobileMenu } from "./MobileMenu";

export type NavLink = { href: string; label: string };

const NAV_LINKS: readonly NavLink[] = [
  { href: "#funktioner", label: "Funktioner" },
  { href: "#saadan", label: "Sådan virker det" },
  { href: "#tryghed", label: "Tryghed" },
  { href: "#pris", label: "Pris" },
];

/** Dark header at the top of the rounded hero card. */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <a href="#top" className={styles.brand}>
          <Wordmark fontSize={24} dark />
        </a>
        <nav aria-label="Hovedmenu" className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          {/* Log ind goes to /login, the signup buttons to /opret. */}
          <Link href="/login" className={styles.loginLink}>
            Log ind
          </Link>
          <Link href="/opret" className={styles.headerCta}>
            Prøv gratis i 30 dage
          </Link>
          <MobileMenu links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
