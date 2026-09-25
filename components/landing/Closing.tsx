import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./landing.module.css";
import { CheckList } from "./CheckList";
import { DownloadIcon, LockIcon, PeopleIcon, ShieldIcon } from "./icons";
import { SignupForm } from "./SignupForm";

const TRUST_CARDS: readonly { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <LockIcon size={26} />,
    title: "Ingen adgang til netbanken",
    body: "Du uploader selv en kontoudskrift. Vi beder aldrig om login til din bank.",
  },
  {
    icon: <DownloadIcon size={26} />,
    title: "Dine data er dine",
    body: "Eksportér alt som PDF, Excel eller sikkerhedskopi, når som helst.",
  },
  {
    icon: <PeopleIcon size={26} />,
    title: "Alene eller sammen",
    body: "Brug det alene, eller invitér dem, du deler økonomi med. I ser de samme tal.",
  },
  {
    icon: <ShieldIcon size={26} />,
    title: "Data bliver i din browser",
    body: "Indtil videre gemmes budgettet kun i din egen browser på denne enhed. Intet sendes til en server.",
  },
];

/** Tryghed gets its own dark band early on the page: people need to trust it before they type in their salary. */
export function Trust() {
  return (
    <section id="tryghed" className={`${styles.section} ${styles.trustBand}`} aria-labelledby="tryghed-title">
      <div className={styles.trustBandHead}>
        <span className={styles.trustBadge}>
          <ShieldIcon size={16} strokeWidth={2} /> Tryghed
        </span>
        <h2 id="tryghed-title" className={`${styles.h2} ${styles.h2Light} ${styles.trustBandTitle}`}>
          Bygget til de tal, man ikke deler med hvem som helst.
        </h2>
        <p className={`${styles.headBody} ${styles.headBodyDark} ${styles.trustBandBody}`}>
          Et budget indeholder løn, lån og kontonumre. Derfor er det dig, der bestemmer, hvad der kommer ind, og hvad der
          kommer ud.
        </p>
      </div>
      <ul className={styles.trustBandGrid}>
        {TRUST_CARDS.map((card) => (
          <li key={card.title} className={styles.trustBandCard}>
            <span className={styles.trustBandIcon} aria-hidden="true">
              {card.icon}
            </span>
            <h3 className={styles.trustBandCardTitle}>{card.title}</h3>
            <p className={styles.trustBandCardBody}>{card.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PRICE_FEATURES = [
  "Ubegrænset antal budgetposter, konti og lån",
  "Opsparingsmål og scenarier",
  "Import af kontoudskrifter",
  "Eksport til PDF, Excel og sikkerhedskopi",
  "Del budgettet med dem, du bor med",
  "Lyst og mørkt tema",
] as const;

const FAQ = [
  {
    q: "Er det virkelig gratis?",
    a: "Ja. Alle funktionerne på denne side er med i den gratis bruger. [Tilføj evt. hvordan tjenesten finansieres]",
  },
  {
    q: "Skal jeg give adgang til min netbank?",
    a: "Nej. Du henter selv en kontoudskrift som CSV eller Excel og uploader den. Beløbene kan også skrives ind i hånden.",
  },
  {
    q: "Kan jeg dele budgettet med andre?",
    a: "Ja. Invitér partner, familie eller en, du deler bolig med. I arbejder i det samme budget, og hver især vælger selv tema og visning.",
  },
  {
    q: "Hvad hvis jeg vil stoppe?",
    a: "Eksportér en sikkerhedskopi og slet din bruger. [Tilføj link til sletning og vilkår]",
  },
] as const;

export function Pricing() {
  return (
    <section id="pris" className={`${styles.section} ${styles.pricing}`} aria-label="Pris og spørgsmål">
      <div className={styles.priceCard}>
        <div className={styles.priceHead}>
          <span className={styles.eyebrow}>Pris</span>
          <span className={styles.priceTag}>Alle funktioner</span>
        </div>
        <div className={styles.priceLine}>
          <b className={styles.priceValue}>0 kr</b>
          <span className={styles.priceNote}>også når I er flere</span>
        </div>
        <CheckList items={PRICE_FEATURES} />
        <Link href="/login" className={styles.buttonBlock}>
          Opret gratis bruger
        </Link>
      </div>
      <div className={styles.faq}>
        <h2 className={`${styles.h2} ${styles.faqTitle}`}>Spørgsmål og svar</h2>
        {FAQ.map((item) => (
          <div key={item.q} className={styles.faqItem}>
            <h3 className={styles.faqQ}>{item.q}</h3>
            <p className={styles.faqA}>{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className={styles.cta} aria-labelledby="cta-title">
      <h2 id="cta-title" className={styles.ctaTitle}>
        Giv din økonomi et hjem. Det tager ti minutter.
      </h2>
      <p className={styles.ctaBody}>Opret en gratis bruger, følg guiden, og se med det samme, hvad du har til rådighed.</p>
      <div className={styles.ctaForm}>
        <SignupForm idPrefix="cta" variant="dark" centered />
      </div>
    </section>
  );
}
