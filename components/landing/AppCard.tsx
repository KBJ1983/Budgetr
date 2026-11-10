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

/*
 * Every number on a card must follow from the others on it, or the picture looks like a sum that is wrong (user's
 * wish). "budget": 64.050 − 48.127 − 12.818 = 3.105 (the app's sentence, incl. savings). "bank": the bank's
 * rådighedsbeløb 28.557 − the guiding requirement 18.000 (12.000 for two adults + 2 × 3.000 for children) = 10.557.
 */
const VIEWS = {
  budget: {
    sentence: (
      <>
        Husstanden har <b>64.050 kr</b> i indtægter, <b>48.127 kr</b> i faste udgifter og <b>12.818 kr</b> i opsparing.
        Tilbage pr. måned: <em>3.105 kr</em>
      </>
    ),
    figures: [
      ["Faste udgifter", "48.127"],
      ["Opsparing", "12.818"],
      ["Tilbage", "3.105"],
    ],
  },
  bank: {
    sentence: (
      <>
        Rådighedsbeløbet, som banken regner det, er <b>28.557 kr</b>. Kravet er <b>18.000 kr</b>, så der er{" "}
        <em>10.557 kr</em> i luft.
      </>
    ),
    figures: [
      ["Rådighedsbeløb", "28.557"],
      ["Vejledende krav", "18.000"],
      ["Luft over kravet", "10.557"],
    ],
  },
} as const;

export function AppCard({ dark = false, view = "budget", className }: { dark?: boolean; view?: keyof typeof VIEWS; className?: string }) {
  const v = VIEWS[view];
  return (
    <div className={[styles.app, dark ? styles.appDark : "", className].filter(Boolean).join(" ")} aria-hidden="true">
      <div className={styles.appBar}>
        <Logo fontSize={14} dark={dark} bg={dark ? "#0B2A2F" : "#ECF1EF"} />
        <span className={styles.appTabs}>
          <b>Overblik</b>
          <span>Poster</span>
          <span>Lån</span>
          <span>Mål</span>
        </span>
      </div>
      <p className={styles.appSentence}>{v.sentence}</p>
      <div className={styles.appFigures}>
        {v.figures.map(([label, value], i) => (
          <span key={label} className={`${styles.appFigure} ${i === v.figures.length - 1 ? styles.appFigureOn : ""}`}>
            {label} <b>{value}</b>
          </span>
        ))}
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

/**
 * Rådighed: the light card with the bank's numbers, and a small phone card on its corner: the luft once the car loan
 * is paid in July 2027 (10.557 + the loan's 3.300 = 13.857, as the app shows it).
 */
export function AppPair() {
  return (
    <div className={styles.appPair}>
      <AppCard view="bank" />
      <div className={styles.appPhone} aria-hidden="true">
        <Logo fontSize={11} bg="#ECF1EF" />
        <span>Luft fra jul 2027</span>
        <b>
          13.857<small> kr</small>
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
