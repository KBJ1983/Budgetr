import Link from "next/link";
import styles from "./landing.module.css";
import { AppCard } from "./AppCard";
import { LogoIntro } from "./LogoIntro";

/**
 * The hero at the bottom of the mynte-tint top card (design "Mynte og is komplet"); the header sits in the same card,
 * above it. The title's second line is thin, with a mynte band under "overblik."; the "29 min · 29 kr" badge is koral.
 * On the right a drawn, dark picture of the Overblik (AppCard).
 */
export function Hero() {
  return (
    <section id="top" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroInner}>
        <HeroShapes />
        <LogoIntro />
        <div className={styles.heroText}>
          <p className={styles.tagline}>
            Dit overblik. Dine drømme.
            <span className={styles.taglineRule} aria-hidden="true" />
            <span className={styles.badge}>29 min · 29 kr</span>
          </p>
          <h1 id="hero-title" className={styles.h1}>
            Hele din økonomi.
            <br />
            <span className={styles.thin}>Ét roligt </span>
            <span className={styles.accent}>overblik.</span>
          </h1>
          <p className={styles.lead}>
            Saml løn, faste udgifter, lån og opsparing ét sted. Se hvad du har til rådighed, hvad du kan spare op, og
            hvad der sker, hvis du flytter, skifter job eller låner. Bor I flere sammen, deler I budgettet og fordeler
            udgifterne fair.
          </p>
          <div id="opret" className={styles.heroActions}>
            <Link href="/opret" className={styles.heroButton}>
              Prøv gratis i 30 dage
            </Link>
            <a href="#film" className={styles.heroButtonGhost}>
              Se hvordan
            </a>
          </div>
          <p className={styles.heroNote}>Intet betalingskort, før de 30 dage er gået.</p>
        </div>
        <div className={styles.heroVisual}>
          <AppCard dark className={styles.heroApp} />
        </div>
      </div>
    </section>
  );
}

/** The top card's decorative shapes (CSS in .heroShapes). Also used by the Erhverv hero. */
export function HeroShapes() {
  return (
    <div className={styles.heroShapes} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}
