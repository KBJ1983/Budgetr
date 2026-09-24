import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import styles from "./landing.module.css";
import { MobileMenu } from "./MobileMenu";

export type NavLink = { href: string; label: string };

const NAV_LINKS: readonly NavLink[] = [
  { href: "#funktioner", label: "Funktioner" },
  { href: "#saadan", label: "Sådan virker det" },
  { href: "#tryghed", label: "Tryghed" },
  { href: "#pris", label: "Pris" },
];

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <a href="#top" className={styles.brand}>
        <LogoMark size={30} />
        <b className={styles.brandName}>budgetr</b>
      </a>
      <nav aria-label="Hovedmenu" className={styles.nav}>
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <div className={styles.headerActions}>
        {/* No login yet: "Log ind" opens the example budget. */}
        <Link href="/app" className={styles.loginLink}>
          Log ind
        </Link>
        <a href="#opret" className={styles.headerCta}>
          Opret gratis bruger
        </a>
        <MobileMenu links={NAV_LINKS} />
      </div>
    </header>
  );
}
