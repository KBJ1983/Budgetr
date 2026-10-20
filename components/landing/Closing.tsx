import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import styles from "./landing.module.css";
import { CheckList } from "./CheckList";
import { DownloadIcon, GlobeIcon, LockIcon, PeopleIcon, PlusIcon, ShieldIcon } from "./icons";
import { PricePlans } from "./PricePlans";
import { SignupForm } from "./SignupForm";
import { SwipeList } from "./Swipe";

const TRUST_CARDS: readonly { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <LockIcon size={20} strokeWidth={1.8} />,
    title: "Ingen adgang til netbanken",
    body: "Du uploader selv en kontoudskrift. Vi beder aldrig om login til din bank.",
  },
  {
    icon: <DownloadIcon size={20} strokeWidth={1.8} />,
    title: "Dine data er dine",
    body: "Eksportér alt som PDF, Excel eller sikkerhedskopi, når som helst.",
  },
  {
    icon: <PeopleIcon size={20} strokeWidth={1.8} />,
    title: "Alene eller sammen",
    body: "Brug det alene, eller invitér dem, du deler økonomi med. I ser de samme tal.",
  },
  {
    icon: <GlobeIcon size={20} strokeWidth={1.8} />,
    title: "Dine data bliver i EU",
    body: "Dit budget og din bruger opbevares på servere i EU og er beskyttet af de europæiske regler for persondata.",
  },
];

/** Tryghed gets its own dark band early on the page: people need to trust it before they type in their salary. */
export function Trust() {
  return (
    <section id="tryghed" className={`${styles.section} ${styles.trustBand}`} aria-labelledby="tryghed-title">
      <div className={styles.trustCircle} aria-hidden="true" />
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>
              <ShieldIcon size={15} strokeWidth={2} /> Tryghed
            </span>
            <h2 id="tryghed-title" className={`${styles.h2} ${styles.h2Light}`}>
              Bygget til de tal, man ikke deler med hvem som helst.
            </h2>
          </div>
          <p className={`${styles.headBody} ${styles.headBodyDark}`}>
            Et budget indeholder løn, lån og opsparing. Derfor er det dig, der bestemmer, hvad der kommer ind, og hvad
            der kommer ud.
          </p>
        </div>
        <SwipeList className={styles.trustBandGrid} label="Tryghed" tone="dark">
          {TRUST_CARDS.map((card) => (
            <li key={card.title} className={styles.trustBandCard}>
              <span className={styles.trustBandIcon} aria-hidden="true">
                {card.icon}
              </span>
              <h3 className={styles.trustBandCardTitle}>{card.title}</h3>
              <p className={styles.trustBandCardBody}>{card.body}</p>
            </li>
          ))}
        </SwipeList>
      </div>
    </section>
  );
}

// PLACEHOLDER: invented quotes from the design ("Forside v2"). Replace them with real, consented quotes before
// the page goes public; made-up reviews must not be shown as real ones.
const QUOTES = [
  {
    text: "Vi har altid haft et regneark, som kun jeg forstod. Nu kan Jonas også se, hvor pengene går hen, og vi taler om økonomi uden at skændes.",
    name: "Anna",
    meta: "Deler budget med Jonas",
    initials: "A",
    color: "#3f6a0e",
  },
  {
    text: "Jeg kunne se med det samme, at billånet udløber til marts. Det gjorde det meget nemmere at planlægge sommerferien.",
    name: "Mikkel",
    meta: "Bor alene",
    initials: "M",
    color: "#52688a",
  },
  {
    text: "Fordelingen efter indkomst gjorde det fair for os begge. Overførslerne passer, og vi får besked, når noget skal rettes i netbanken.",
    name: "Sara og Ali",
    meta: "To børn, fælles budgetkonto",
    initials: "SA",
    color: "#0e1b2c",
  },
] as const;

export function Quotes() {
  return (
    <section className={`${styles.section} ${styles.quotes}`} aria-labelledby="citater-title">
      <div className={styles.quotesCircle} aria-hidden="true" />
      <div className={styles.sectionInner}>
        <div className={styles.quotesHead} data-reveal>
          <span className={styles.quotesFrom}>
            Fra hverdagen med <Logo fontSize={20} dark />
          </span>
          <div className={styles.quotesTitleRow}>
            <span className={styles.quoteMark} aria-hidden="true">
              “
            </span>
            <h2 id="citater-title" className={`${styles.h2} ${styles.h2Light}`}>
              Det siger dem, der bruger det.
            </h2>
          </div>
        </div>
        <SwipeList className={styles.quoteGrid} label="Citater" tone="dark">
          {QUOTES.map((q) => (
            <li key={q.name}>
              <figure className={styles.quoteCard}>
                <blockquote className={styles.quoteText}>“{q.text}”</blockquote>
                <figcaption className={styles.quoteWho}>
                  <span className={styles.quoteAvatar} style={{ background: q.color }} aria-hidden="true">
                    {q.initials}
                  </span>
                  <span>
                    <b>{q.name}</b>
                    <span>{q.meta}</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </SwipeList>
      </div>
    </section>
  );
}

const PRICE_FEATURES = [
  "Ubegrænset antal budgetposter, konti og lån",
  "Opsparingsmål og scenarier",
  "Beskeder ved milepæle og påmindelser",
  "Import af kontoudskrifter",
  "Eksport til PDF, Excel og sikkerhedskopi",
  "Del budgettet med dem, du bor med",
  "Lyst og mørkt tema",
] as const;

const FAQ = [
  {
    q: "Hvad koster det?",
    a: "De første 30 dage er gratis med alle funktioner, og du skal ikke oplyse betalingskort for at starte. Kortet skal først bruges, når de 30 dage er gået. Derefter koster det 29 kr om måneden. Deler du budgettet med andre, koster hver ekstra bruger 9 kr om måneden. Betaler du årligt, sparer du 15 %: 296 kr om året og 92 kr om året for hver ekstra bruger. Priserne er inkl. moms.",
  },
  {
    q: "Skal jeg give adgang til min netbank?",
    a: "Nej. Du henter selv en kontoudskrift som CSV, Excel eller PDF og uploader den. Beløbene kan også skrives ind i hånden.",
  },
  {
    q: "Hvordan virker påmindelserne?",
    a: "Du vælger, hvor tit du vil mindes om at se budgettet igennem. Påmindelsen kommer kun, hvis budgettet ikke er rettet i perioden, og vises, når du logger ind. Du kan også få den på mail eller sms.",
  },
  {
    q: "Kan jeg dele budgettet med andre?",
    a: "Ja. Invitér partner, familie eller en, du deler bolig med. I arbejder i det samme budget, og hver især vælger selv tema og visning. Hver ekstra bruger koster 9 kr om måneden.",
  },
  {
    q: "Hvad hvis jeg vil stoppe?",
    a: "Du kan stoppe når som helst, uden binding. Vil du gemme budgettet, så hent en sikkerhedskopi under Import og eksport. Under Indstillinger > Din bruger sletter du din bruger, så budgettet, alle tidligere versioner og dine kontaktoplysninger bliver slettet med det samme. Læs mere i vilkårene og privatlivspolitikken nederst på siden.",
  },
] as const;

export function Pricing() {
  return (
    <section id="pris" className={`${styles.section} ${styles.pricing}`} aria-label="Pris og spørgsmål">
      <div className={`${styles.sectionInner} ${styles.pricingInner}`}>
        <div className={styles.priceCard} data-reveal="tilt">
          <div className={styles.priceHead}>
            <span className={styles.eyebrow}>Pris</span>
            <span className={styles.priceTag}>Alle funktioner</span>
          </div>
          <PricePlans />
          <CheckList items={PRICE_FEATURES} />
          <Link href="/opret" className={styles.buttonBlock}>
            Prøv gratis i 30 dage
          </Link>
          <p className={styles.priceCardNote}>Intet betalingskort nu. Det skal først bruges, når de 30 dage er gået.</p>
        </div>
        <div className={styles.faq} data-reveal-group>
          <h2 className={`${styles.h2} ${styles.faqTitle}`}>Spørgsmål og svar</h2>
          {FAQ.map((item, i) => (
            <details key={item.q} className={styles.faqItem} open={i === 0} name="faq">
              <summary className={styles.faqQ}>
                <span>{item.q}</span>
                <span className={styles.faqPlus} aria-hidden="true">
                  <PlusIcon size={14} strokeWidth={2.2} />
                </span>
              </summary>
              <p className={styles.faqA}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className={styles.ctaWrap} aria-labelledby="cta-title">
      <div className={styles.cta}>
        <div className={styles.ctaInner}>
          <Logo fontSize={36} tone="lime" />
          <h2 id="cta-title" className={styles.ctaTitle}>
            Slip for de mange versioner af Excel-budgettet.
          </h2>
          <p className={styles.ctaLead}>Ét samlet budget. Tilgængeligt overalt.</p>
          <p className={styles.ctaBody}>Prøv gratis i 30 dage, og følg guiden. Betalingskortet skal først bruges, når de 30 dage er gået.</p>
          <div className={styles.ctaForm}>
            <SignupForm idPrefix="cta" centered />
          </div>
        </div>
      </div>
    </section>
  );
}
