import { BRAND, Logo } from "@/components/Logo";
import { COMPANY } from "@/lib/company";
import styles from "./landing.module.css";
import type { NavLink } from "./SiteHeader";

const LINKS: readonly NavLink[] = [
  { href: "#funktioner", label: "Funktioner" },
  { href: "#tryghed", label: "Tryghed" },
  { href: "#pris", label: "Pris" },
  { href: "/erhverv", label: "Erhverv" },
  { href: "/skole", label: "Skole" },
];
const LEGAL: readonly NavLink[] = [
  { href: "/vilkaar", label: "Vilkår" },
  { href: "/privatliv", label: "Privatlivspolitik" },
  { href: "/privatliv#cookies", label: "Cookies" },
  { href: `mailto:${COMPANY.email}`, label: "Kontakt" },
];

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
        <span className={styles.footerCompany}>
          © 2026 {COMPANY.name} · {COMPANY.address} · CVR {COMPANY.cvr} · {COMPANY.email}
        </span>
      </div>
    </footer>
  );
}
