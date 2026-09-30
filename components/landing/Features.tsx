import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import styles from "./landing.module.css";
import { CalendarIcon, LoanIcon, TransferIcon, UploadIcon } from "./icons";

const FEATURES: readonly { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <LoanIcon size={20} strokeWidth={1.8} />,
    title: "Lån",
    body: "Restgæld, rente og ydelse giver en beregnet slutdato for hvert lån, og en tidslinje viser, hvor meget der frigives om måneden.",
  },
  {
    icon: <TransferIcon size={20} strokeWidth={1.8} />,
    title: "Faste overførsler",
    body: "Se alle pengestrømme mellem dine konti, og få besked, når en overførsel ikke længere passer.",
  },
  {
    icon: <CalendarIcon size={20} strokeWidth={1.8} />,
    title: "Måned for måned",
    body: "Se ind, ud og saldo på hver konto måned for måned, og få besked, hvis en konto kommer i minus i løbet af året.",
  },
  {
    icon: <UploadIcon size={20} strokeWidth={1.8} />,
    title: "Importér kontoudskriften",
    body: "Posteringer genkendes på aftalenummer og tekst. Du vælger selv, hvad der opdateres, og det gamle beløb gemmes.",
  },
];

/** The remaining features as a dark band between the light sections: intro on the left, a quiet list on the right. */
export function Features() {
  return (
    <section id="mere" className={`${styles.section} ${styles.featureBand}`} aria-labelledby="mere-title">
      <div className={`${styles.sectionInner} ${styles.featureBandInner}`}>
        <div className={styles.featureBandText} data-reveal>
          <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>Alt det andet</span>
          <h2 id="mere-title" className={`${styles.h2} ${styles.h2Light}`}>
            Lån, overførsler og saldi. Regnet ud for dig.
          </h2>
          <p className={`${styles.headBody} ${styles.headBodyDark}`}>
            Det, der ellers kræver et regneark, holder budgettet selv styr på, måned for måned.
          </p>
        </div>
        <ul className={styles.featureList} data-reveal style={{ "--reveal-delay": "140ms" } as CSSProperties}>
          {FEATURES.map((f) => (
            <li key={f.title} className={styles.featureItem}>
              <span className={styles.trustBandIcon} aria-hidden="true">
                {f.icon}
              </span>
              <h3 className={styles.trustBandCardTitle}>{f.title}</h3>
              <p className={styles.trustBandCardBody}>{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PLANS = [
  {
    src: "/landing/foto-strand.jpg",
    alt: "En familie på stranden i solnedgang",
    position: "center 70%",
    label: "Opsparingsmål",
    title: "Giv drømmen en dato.",
    body: "Et fast beløb til en dato, eller en fast månedlig indbetaling. Feriepenge og bonus kan lægges ind som ekstra indbetalinger.",
  },
  {
    src: "/landing/foto-noegler.jpg",
    alt: "En familie, der får nøglerne til et nyt hjem",
    position: "center 45%",
    label: "Scenarier",
    title: "Kend rådigheden, før I byder.",
    body: "Hvad sker der, hvis I køber bolig, går på barsel eller skifter job? Hvert scenarie holdes op mod det nuværende budget.",
  },
] as const;

/** Opsparingsmål and scenarier: a card each, photo on top and the text below it (no text over the photos). */
export function Plans() {
  return (
    <section id="planer" className={`${styles.section} ${styles.plans}`} aria-labelledby="planer-title">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={styles.eyebrow}>Opsparing og scenarier</span>
            <h2 id="planer-title" className={styles.h2}>
              Planlæg det, der skal ske.
            </h2>
          </div>
          <p className={styles.headBody}>Planlæg det næste skridt uden at røre det budget, du lever efter i dag.</p>
        </div>
        <ul className={styles.planGrid} data-reveal-group>
          {PLANS.map((p) => (
            <li key={p.src} className={styles.planCard}>
              <div className={styles.planPhoto}>
                <Image src={p.src} alt={p.alt} fill sizes="(max-width: 767px) 100vw, 560px" className={styles.photoCover} style={{ objectPosition: p.position }} />
              </div>
              <div className={styles.planText}>
                <span className={styles.eyebrow}>{p.label}</span>
                <h3 className={styles.planTitle}>{p.title}</h3>
                <p className={styles.stepBody}>{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
