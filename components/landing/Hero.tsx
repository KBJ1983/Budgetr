import Link from "next/link";
import styles from "./landing.module.css";
import { HeroPhone, HeroShowcase } from "./Shots";
import { ArrowRightIcon, CheckIcon, PeopleIcon } from "./icons";

const PROMISES = ["Gratis", "Ingen adgang til netbank", "Klar på 10 minutter"] as const;

/** Dark hero inside the rounded top card (design "Forside v2"); the header sits in the same card, above it. */
export function Hero() {
  return (
    <section id="top" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroInner}>
        <div className={styles.heroText}>
          <span className={styles.badge}>
            <span className={styles.badgeIcon}>
              <PeopleIcon size={13} strokeWidth={2} />
            </span>
            Alene, som par eller familie
          </span>
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
              Opret gratis bruger <ArrowRightIcon size={16} />
            </Link>
            <a href="#saadan" className={styles.heroLink}>
              Sådan virker det
            </a>
          </div>
          <ul className={styles.promises}>
            {PROMISES.map((promise) => (
              <li key={promise}>
                <span className={styles.promiseDot}>
                  <CheckIcon size={10} strokeWidth={3} />
                </span>
                {promise}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroDots} aria-hidden="true" />
          {/* No floating cards over the window (the design's pill and goal card are left out on purpose). */}
          <HeroShowcase />
        </div>
        <div className={styles.heroMobile}>
          <HeroPhone />
        </div>
      </div>
    </section>
  );
}
