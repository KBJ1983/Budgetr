import type { ReactNode } from "react";
import styles from "./landing.module.css";
import { BranchIcon, CalendarIcon, LoanIcon, TargetIcon, TransferIcon, UploadIcon } from "./icons";

const FEATURES: readonly { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <LoanIcon size={22} />,
    title: "Lån",
    body: "Restgæld, rente og ydelse giver en beregnet slutdato for hvert lån, og en tidslinje viser, hvor meget der frigives om måneden.",
  },
  {
    icon: <TargetIcon size={22} />,
    title: "Opsparingsmål",
    body: "Et fast beløb til en dato, eller en fast månedlig indbetaling. Feriepenge og bonus kan lægges ind som ekstra indbetalinger.",
  },
  {
    icon: <BranchIcon size={22} />,
    title: "Scenarier",
    body: "Hvad sker der, hvis du køber bolig, går på barsel eller skifter job? Hvert scenarie holdes op mod det nuværende budget.",
  },
  {
    icon: <TransferIcon size={22} />,
    title: "Faste overførsler",
    body: "Se alle pengestrømme mellem dine konti, og få besked, når en overførsel ikke længere passer.",
  },
  {
    icon: <CalendarIcon size={22} />,
    title: "Måned for måned",
    body: "Se ind, ud og saldo på hver konto måned for måned, og få besked, hvis en konto kommer i minus i løbet af året.",
  },
  {
    icon: <UploadIcon size={22} />,
    title: "Importér kontoudskriften",
    body: "Posteringer genkendes på aftalenummer og tekst. Du vælger selv, hvad der opdateres, og det gamle beløb gemmes.",
  },
];

/** "Alt det andet": the remaining features as text cards, without product cut-outs. */
export function Features() {
  return (
    <section id="funktioner" className={`${styles.section} ${styles.featureSection}`} aria-labelledby="funktioner-title">
      <div className={styles.sectionHead}>
        <div className={styles.sectionHeadTitle}>
          <span className={styles.eyebrow}>Alt det andet</span>
          <h2 id="funktioner-title" className={styles.h2}>
            Opsparing, scenarier og det, der ændrer sig.
          </h2>
        </div>
        <p className={styles.headBody}>Planlæg det næste skridt uden at røre det budget, du lever efter i dag.</p>
      </div>
      <ul className={styles.featureCards}>
        {FEATURES.map((f) => (
          <li key={f.title} className={styles.featureCard}>
            <span className={styles.featureIcon} aria-hidden="true">
              {f.icon}
            </span>
            <h3 className={styles.featureCardTitle}>{f.title}</h3>
            <p className={styles.featureCardBody}>{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
