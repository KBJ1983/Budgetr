import styles from "./landing.module.css";
import { HeroFloatGoal, HeroFloatScenario, HeroMobileCutout, HeroWindow } from "./cutouts";
import { CheckIcon, PeopleIcon } from "./icons";
import { SignupForm } from "./SignupForm";

const PROMISES = ["Gratis", "Ingen adgang til netbank", "Klar på 10 minutter"] as const;

export function Hero() {
  return (
    <section id="top" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroText}>
        <span className={styles.badge}>
          <PeopleIcon size={16} strokeWidth={2} /> Alene, som par eller familie
        </span>
        <h1 id="hero-title" className={styles.h1}>
          Hele din økonomi. <span className={styles.accent}>Ét roligt overblik.</span>
        </h1>
        <p className={styles.lead}>
          Saml løn, faste udgifter, lån og opsparing ét sted. Se hvad du har til rådighed, hvad du kan spare op, og hvad
          der sker, hvis du flytter, skifter job eller betaler et lån ud. Bor I flere sammen, deler I budgettet og
          fordeler udgifterne fair.
        </p>
        <div id="opret" className={styles.opret}>
          <SignupForm idPrefix="hero" />
        </div>
        <ul className={styles.promises}>
          {PROMISES.map((promise) => (
            <li key={promise}>
              <CheckIcon size={16} /> {promise}
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.heroVisual}>
        <HeroWindow />
        <HeroFloatGoal />
        <HeroFloatScenario />
      </div>
      <div className={styles.heroMobile}>
        <HeroMobileCutout />
      </div>
    </section>
  );
}
