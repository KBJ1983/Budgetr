import { LogoMark } from "@/components/Logo";
import styles from "./landing.module.css";

const LEGAL_LINKS = ["Vilkår", "Privatlivspolitik", "Cookies", "Kontakt"] as const;
const COMPANY = "[Firmanavn · CVR]";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <LogoMark size={24} />
        <b className={styles.footerName}>budgetr</b>
        <span className={styles.companyWide}>{COMPANY}</span>
      </div>
      <nav aria-label="Sidefod" className={styles.footerNav}>
        {/* Legal pages do not exist yet. */}
        {LEGAL_LINKS.map((label) => (
          <a key={label} href="#">
            {label}
          </a>
        ))}
      </nav>
      <span className={styles.companyNarrow}>{COMPANY}</span>
    </footer>
  );
}
