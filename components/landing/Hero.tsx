import Link from "next/link";
import styles from "./landing.module.css";
import { HeroPhone, HeroShowcase } from "./Shots";
import { ArrowRightIcon } from "./icons";
import { LogoIntro } from "./LogoIntro";

/**
 * Light hero inside the rounded top card (layout "Forside v2", light treatment from docs/design/midnat-forside.html);
 * the header sits in the same card, above it. The accent part of the title gets the lime highlight underline.
 */
export function Hero() {
  return (
    <section id="top" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroInner}>
        <LogoIntro />
        <div className={styles.heroText}>
          <p className={styles.tagline}>Dit overblik. Dine drømme.</p>
          <h1 id="hero-title" className={styles.h1}>
            Hele din økonomi. <span className={styles.accent}>Ét roligt overblik.</span>
          </h1>
          <p className={styles.lead}>
            Saml løn, faste udgifter, lån og opsparing ét sted. Se hvad du har til rådighed, hvad du kan spare op, og
            hvad der sker, hvis du flytter, skifter job eller betaler et lån ud. Bor I flere sammen, deler I budgettet og
            fordeler udgifterne fair.
          </p>
          <div id="opret" className={styles.heroActions}>
            <Link href="/opret" className={styles.heroButton}>
              Prøv gratis i 30 dage <ArrowRightIcon size={16} />
            </Link>
            <p className={styles.heroNote}>Intet betalingskort nu. Det skal først bruges, når de 30 dage er gået.</p>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroDots} aria-hidden="true" />
          {/* Nothing moves in the hero (the logo intro is the only motion); no floating cards or pills around the window. */}
          <HeroShowcase />
        </div>
        <div className={styles.heroMobile}>
          <HeroPhone />
        </div>
      </div>
    </section>
  );
}
