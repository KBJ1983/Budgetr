import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./landing.module.css";
import { SwipeList } from "./Swipe";
import { BranchIcon, CalendarIcon, LoanIcon, TargetIcon, TransferIcon, UploadIcon } from "./icons";

const FEATURES: readonly { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <LoanIcon size={20} strokeWidth={1.8} />,
    title: "Lån",
    body: "Restgæld, rente og ydelse giver en beregnet slutdato for hvert lån, og en tidslinje viser, hvor meget der frigives om måneden.",
  },
  {
    icon: <TargetIcon size={20} strokeWidth={1.8} />,
    title: "Opsparingsmål",
    body: "Et fast beløb til en dato, eller en fast månedlig indbetaling. Feriepenge og bonus kan lægges ind som ekstra indbetalinger.",
  },
  {
    icon: <BranchIcon size={20} strokeWidth={1.8} />,
    title: "Scenarier",
    body: "Hvad sker der, hvis du køber bolig, går på barsel eller skifter job? Hvert scenarie holdes op mod det nuværende budget.",
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

const PHOTOS = [
  { src: "/landing/foto-strand.jpg", alt: "En familie på stranden i solnedgang", label: "Opsparingsmål", title: "Giv drømmen en dato.", position: "center 70%" },
  { src: "/landing/foto-noegler.jpg", alt: "En familie, der får nøglerne til et nyt hjem", label: "Scenarier", title: "Kend rådigheden, før I byder.", position: "center 45%" },
] as const;

/** "Alt det andet": two photo cards, then the remaining features as text cards, without product cut-outs. */
export function Features() {
  return (
    <section id="mere" className={`${styles.section} ${styles.featureSection}`} aria-labelledby="mere-title">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={styles.eyebrow}>Alt det andet</span>
            <h2 id="mere-title" className={styles.h2}>
              Opsparing, scenarier og det, der ændrer sig.
            </h2>
          </div>
          <p className={styles.headBody}>Planlæg det næste skridt uden at røre det budget, du lever efter i dag.</p>
        </div>
        <div className={styles.photoCards} data-reveal>
          {PHOTOS.map((p) => (
            <figure key={p.src} className={styles.photoCard}>
              <Image src={p.src} alt={p.alt} fill sizes="(max-width: 767px) 100vw, 560px" className={styles.photoCover} style={{ objectPosition: p.position }} />
              <div className={styles.photoCardShade} aria-hidden="true" />
              <figcaption className={styles.photoCardText}>
                <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>{p.label}</span>
                <span className={styles.photoCardTitle}>{p.title}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <SwipeList className={styles.featureCards} label="Funktioner">
          {FEATURES.map((f) => (
            <li key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                {f.icon}
              </span>
              <h3 className={styles.featureCardTitle}>{f.title}</h3>
              <p className={styles.featureCardBody}>{f.body}</p>
            </li>
          ))}
        </SwipeList>
      </div>
    </section>
  );
}
