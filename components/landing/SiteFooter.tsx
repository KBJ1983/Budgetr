import { Wordmark } from "@/components/Logo";
import styles from "./landing.module.css";

const LINKS = [
  { href: "#funktioner", label: "Funktioner" },
  { href: "#tryghed", label: "Tryghed" },
  { href: "#pris", label: "Pris" },
  // Legal pages do not exist yet.
  { href: "#", label: "Vilkår" },
  { href: "#", label: "Privatlivspolitik" },
] as const;
const COMPANY = "[Firmanavn · CVR]";
const EMAIL = "info@budgetpro.dk";
const PHONE = { href: "tel:+4527114717", label: "27 11 47 17" };

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
        <div className={styles.footerContact}>
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <a href={PHONE.href}>{PHONE.label}</a>
          <span>© 2026 budgetpro · {COMPANY}</span>
        </div>
      </div>
    </footer>
  );
}
