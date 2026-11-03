import { Logo } from "@/components/Logo";
import styles from "./landing.module.css";

/*
 * A drawn, compact picture of the app's Overblik (design "Mynte og is komplet"): the sentence, three key figures and
 * eight months of income/expense bars. The numbers are the fictional demo family's (lib/demo-customer.ts, Sofie and
 * Mikkel); keep them in step with the Overblik that `pnpm shots` renders from scripts/demo-budget.mjs if that changes.
 */

// Income and expense per month, as bar heights out of 60 (the 3rd month has a quarterly bill and goes over).
const MONTHS: readonly [number, number, boolean?][] = [
  [53, 41],
  [51, 47],
  [55, 60, true],
  [52, 45],
  [54, 50],
  [57, 43],
  [55, 46],
  [56, 42],
];

export function AppCard({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <div className={[styles.app, dark ? styles.appDark : "", className].filter(Boolean).join(" ")} aria-hidden="true">
      <div className={styles.appBar}>
        <Logo fontSize={14} dark={dark} bg={dark ? "#0A0D0E" : "#ECF1EF"} />
        <span className={styles.appTabs}>
          <b>Overblik</b>
          <span>Poster</span>
          <span>Lån</span>
          <span>Mål</span>
        </span>
      </div>
      <p className={styles.appSentence}>
        {/* Must add up: 64.050 − 48.127 − 12.818 = 3.105 (the app's own sentence, incl. savings). */}
        Husstanden har <b>64.050 kr</b> i indtægter, <b>48.127 kr</b> i faste udgifter og <b>12.818 kr</b> i opsparing. Tilbage pr. måned: <em>3.105 kr</em>
      </p>
      <div className={styles.appFigures}>
        <span className={styles.appFigure}>
          Rådighed <b>28.557</b>
        </span>
        <span className={`${styles.appFigure} ${styles.appFigureOn}`}>
          Luft over kravet <b>10.557</b>
        </span>
        <span className={styles.appFigure}>
          Fra jul 2027 <b>13.857</b>
        </span>
      </div>
      <div className={styles.appBars}>
        {MONTHS.map(([inc, exp, over], i) => (
          <span key={i}>
            <i style={{ height: inc }} />
            <i style={{ height: exp }} data-over={over ? "" : undefined} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Rådighed: the light card with a small phone card ("Tilbage i marts") on its lower right corner. */
export function AppPair() {
  return (
    <div className={styles.appPair}>
      <AppCard />
      <div className={styles.appPhone} aria-hidden="true">
        <Logo fontSize={11} bg="#ECF1EF" />
        <span>Tilbage i marts</span>
        <b>
          3.105<small> kr</small>
        </b>
        <span className={styles.appTrack}>
          <span style={{ width: "62%" }} />
        </span>
        <span className={styles.appTrack}>
          <span style={{ width: "41%" }} />
        </span>
      </div>
    </div>
  );
}
