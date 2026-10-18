import { BRAND, Logo } from "@/components/Logo";
import styles from "./landing.module.css";
import type { NavLink } from "./SiteHeader";

const LINKS: readonly NavLink[] = [
  { href: "#funktioner", label: "Funktioner" },
  { href: "#tryghed", label: "Tryghed" },
  { href: "#pris", label: "Pris" },
  { href: "/erhverv", label: "Erhverv" },
  { href: "/skole", label: "Skole" },
];
// Legal pages do not exist yet.
const LEGAL: readonly NavLink[] = [
  { href: "#", label: "Vilkår" },
  { href: "#", label: "Privatlivspolitik" },
  { href: "#", label: "Kontakt" },
];
const COMPANY = "[Firmanavn · CVR]";

export function SiteFooter({ links = LINKS }: { links?: readonly NavLink[] }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <Logo fontSize={24} bg={BRAND.paper} />
        <nav aria-label="Sidefod" className={styles.footerNav}>
          {[...links, ...LEGAL].map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <span className={styles.footerCompany}>© 2026 budgetpro · {COMPANY}</span>
      </div>
    </footer>
  );
}
