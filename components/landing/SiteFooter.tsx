import { Wordmark } from "@/components/Logo";
import styles from "./landing.module.css";

const LINKS = [
  { href: "#funktioner", label: "Funktioner" },
  { href: "#tryghed", label: "Tryghed" },
  { href: "#pris", label: "Pris" },
  // Legal pages do not exist yet.
  { href: "#", label: "Vilkår" },
  { href: "#", label: "Privatlivspolitik" },
  { href: "#", label: "Kontakt" },
] as const;
const COMPANY = "[Firmanavn · CVR]";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <Wordmark fontSize={28} />
        <nav aria-label="Sidefod" className={styles.footerNav}>
          {LINKS.map((link) => (
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
