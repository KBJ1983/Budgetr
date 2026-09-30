"use client";

import { useState } from "react";
import styles from "./landing.module.css";

const PLANS = {
  monthly: {
    label: "Månedlig",
    value: "19 kr",
    unit: "pr. måned",
    note: "Efter 30 dages gratis prøveperiode. Ingen binding. Hele husstanden er med.",
  },
  yearly: {
    label: "Årlig",
    tag: "Spar 15 %",
    value: "194 kr",
    unit: "pr. år",
    note: "Svarer til ca. 16 kr om måneden. Efter 30 dages gratis prøveperiode. Hele husstanden er med.",
  },
} as const;

type Plan = keyof typeof PLANS;

/** Monthly / yearly switch and the price for the chosen plan (price card, design "Forside v2"). */
export function PricePlans() {
  const [plan, setPlan] = useState<Plan>("monthly");
  const price = PLANS[plan];
  return (
    <>
      <div className={styles.planSwitch} role="group" aria-label="Betaling">
        {(Object.keys(PLANS) as Plan[]).map((key) => {
          const p = PLANS[key];
          return (
            <button key={key} type="button" className={styles.planButton} aria-pressed={plan === key} onClick={() => setPlan(key)}>
              {p.label}
              {"tag" in p && <span className={styles.planTag}>{p.tag}</span>}
            </button>
          );
        })}
      </div>
      <div className={styles.priceBlock} aria-live="polite">
        <div className={styles.priceLine}>
          <b className={styles.priceValue}>{price.value}</b>
          <span className={styles.priceUnit}>{price.unit}</span>
        </div>
        <p className={styles.priceNote}>{price.note}</p>
      </div>
    </>
  );
}
