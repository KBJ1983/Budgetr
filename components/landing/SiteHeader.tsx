import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { SiteSwitch } from "@/components/SiteSwitch";
import type { Site } from "@/lib/site-host";
import styles from "./landing.module.css";
import { MobileMenu } from "./MobileMenu";

export type NavLink = { href: string; label: string };

const NAV_LINKS: readonly NavLink[] = [
  { href: "#funktioner", label: "Funktioner" },
  { href: "#saadan", label: "Sådan virker det" },
  { href: "#tryghed", label: "Tryghed" },
  { href: "#pris", label: "Pris" },
];

type SiteHeaderProps = {
  site?: Site;
  links?: readonly NavLink[];
  login?: NavLink;
  cta?: NavLink;
};

/** Dark header at the top of the rounded hero card, with the Privat · Erhverv · Skole switch above it. */
export function SiteHeader({
  site = "privat",
  links = NAV_LINKS,
  login = { href: "/login", label: "Log ind" },
  cta = { href: "/opret", label: "Prøv gratis i 30 dage" },
}: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <SiteSwitch current={site} />
      <div className={styles.headerInner}>
        <a href="#top" className={styles.brand}>
          <Wordmark fontSize={24} dark />
        </a>
        <nav aria-label="Hovedmenu" className={styles.nav}>
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link href={login.href} className={styles.loginLink}>
            {login.label}
          </Link>
          <Link href={cta.href} className={styles.headerCta}>
            {cta.label}
          </Link>
          <MobileMenu links={links} />
        </div>
      </div>
    </header>
  );
}
