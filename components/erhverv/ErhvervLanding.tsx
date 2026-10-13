import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/components/landing/landing.module.css";
import { CheckList } from "@/components/landing/CheckList";
import { InPageLinks } from "@/components/landing/InPageLinks";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader, type NavLink } from "@/components/landing/SiteHeader";
import { SwipeList } from "@/components/landing/Swipe";
import { ArrowRightIcon, DownloadIcon, LockIcon, PeopleIcon, PlusIcon, ShieldIcon, UploadIcon, WandIcon } from "@/components/landing/icons";
import { ContactForm } from "./ContactForm";
import e from "./erhverv.module.css";

const NAV_LINKS: readonly NavLink[] = [
  { href: "#saadan", label: "Sådan virker det" },
  { href: "#brancher", label: "Brancher" },
  { href: "#tryghed", label: "Tryghed" },
  { href: "#kontakt", label: "Kontakt" },
];

const FOOTER_LINKS: readonly NavLink[] = [
  { href: "#saadan", label: "Sådan virker det" },
  { href: "#brancher", label: "Brancher" },
  { href: "#kontakt", label: "Kontakt" },
];

/**
 * The Erhverv page (erhverv.<domain>, /erhverv): banks, estate agents, schools and others give their customers
 * access to budgetpro through an agreement (docs/plans/2026-10-13-aftaler-adgang.md). Uses the landing page's styles
 * and header; the hero shows a drawn miniature of the kundeadmin page /aftale with made-up e-mails.
 */
export function ErhvervLanding({ skoleUrl }: { skoleUrl: string }) {
  return (
    <div className={styles.page}>
      <SiteHeader site="erhverv" links={NAV_LINKS} login={{ href: "/aftale", label: "Log ind" }} cta={{ href: "#kontakt", label: "Hør om en aftale" }} />
      <main>
        <Hero />
        <Steps />
        <Sectors skoleUrl={skoleUrl} />
        <Others />
        <Trust />
        <Contact />
      </main>
      <SiteFooter links={FOOTER_LINKS} />
      <ScrollReveal />
      <InPageLinks />
    </div>
  );
}

function Hero() {
  return (
    <section id="top" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroInner}>
        <div className={styles.heroText}>
          <p className={styles.tagline}>budgetpro Erhverv</p>
          <h1 id="hero-title" className={styles.h1}>
            Giv dine kunder <span className={styles.accent}>styr på budgettet.</span>
          </h1>
          <p className={styles.lead}>
            Banker, ejendomsmæglere og skoler kan give budgetpro videre til deres kunder, elever eller lærere. I køber et
            antal pladser og skriver en e-mail. Kunden får sin egen adgang med en personlig kode.
          </p>
          <div className={styles.heroActions}>
            <a href="#kontakt" className={styles.heroButton}>
              Hør om en aftale <ArrowRightIcon size={16} />
            </a>
            <p className={styles.heroNote}>
              Har I allerede en aftale?{" "}
              <Link href="/aftale" className={e.heroLink}>
                Log ind og giv adgang
              </Link>
            </p>
          </div>
        </div>
        <AdminMock />
      </div>
    </section>
  );
}

/** A drawn miniature of /aftale. Made-up e-mails only. */
function AdminMock() {
  const rows = [
    { email: "kunde.a@eksempel.dk", status: "I brug til 14.10.2027" },
    { email: "kunde.b@eksempel.dk", status: "I brug til 2.9.2027" },
    { email: "kunde.c@eksempel.dk", status: "Sendt, ikke brugt endnu" },
  ];
  return (
    <figure className={e.mock} aria-label="Eksempel: sådan ser det ud, når I giver adgang">
      <div className={e.mockBar}>
        <span>Aftale med budgetpro</span>
        <span className={e.mockOrg}>Eksempel Bank</span>
      </div>
      <div className={e.mockTiles}>
        <div className={`${e.mockTile} ${e.mockTileHi}`}>
          <span>Fri pladser</span>
          <b>38</b>
        </div>
        <div className={e.mockTile}>
          <span>I brug</span>
          <b>57</b>
        </div>
        <div className={e.mockTile}>
          <span>Sendt</span>
          <b>5</b>
        </div>
      </div>
      <div className={e.mockGive}>
        <span className={e.mockLabel}>Kundens e-mail</span>
        <div className={e.mockGiveRow}>
          <span className={e.mockInput}>navn@eksempel.dk</span>
          <span className={e.mockButton}>Send kode</span>
        </div>
      </div>
      <ul className={e.mockList}>
        {rows.map((r) => (
          <li key={r.email}>
            <b>{r.email}</b>
            <small>{r.status}</small>
          </li>
        ))}
      </ul>
      <figcaption className={e.mockCaption}>I ser e-mail og status. Aldrig kundens tal.</figcaption>
    </figure>
  );
}

const STEPS = [
  {
    icon: <PeopleIcon size={22} strokeWidth={1.7} />,
    title: "Vi laver en aftale",
    body: "I vælger, hvor mange pladser I vil have, og hvor mange måneder hver plads gælder, fx 100 pladser med 12 måneder. Pladserne kan sendes ud i et år.",
  },
  {
    icon: <WandIcon size={22} strokeWidth={1.7} />,
    title: "I sender adgang med en e-mail",
    body: "Jeres administratorer logger ind med en kode på mail og skriver kundens e-mail. Det er det hele. Op til fem kolleger kan være administratorer.",
  },
  {
    icon: <UploadIcon size={22} strokeWidth={1.7} />,
    title: "Kunden kommer i gang",
    body: "Kunden får en mail fra budgetpro med jeres navn og en personlig kode. Månederne tæller fra den dag, koden bliver brugt.",
  },
] as const;

function Steps() {
  return (
    <section id="saadan" className={`${styles.section} ${styles.steps}`} aria-labelledby="saadan-title">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={styles.eyebrow}>Sådan virker en aftale</span>
            <h2 id="saadan-title" className={styles.h2}>
              I skriver en e-mail. Vi klarer resten.
            </h2>
          </div>
          <p className={styles.headBody}>
            Der er intet at installere og ingen integration med jeres systemer. Kunden opretter sin egen konto, og budgettet
            er kundens eget.
          </p>
        </div>
        <SwipeList as="ol" className={styles.stepGrid} label="Trin">
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <div className={styles.stepTop}>
                <span className={styles.stepIcon} aria-hidden="true">
                  {step.icon}
                </span>
                <span className={styles.stepNum} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </SwipeList>
      </div>
    </section>
  );
}

type SectorCard = { tag: string; title: string; body: string; bullets: readonly string[]; link?: { href: string; label: string } };

function Sectors({ skoleUrl }: { skoleUrl: string }) {
  const cards: readonly SectorCard[] = [
    {
      tag: "Banker",
      title: "Kunder, der kommer med et budget.",
      body: "Rådighedsbeløbet i budgetpro regnes, som banken gør, når kunden søger lån. Giv adgang før lånesamtalen eller som en fordel til nye kunder, så samtalen kan handle om rådgivning i stedet for at samle tal.",
      bullets: ["Fx 12 eller 24 måneder pr. plads", "Løn, lån, opsparing og rådighed ét sted", "Kunden deler selv budgettet som PDF eller Excel"],
    },
    {
      tag: "Ejendomsmæglere",
      title: "Et budget, der følger med nøglerne.",
      body: "Når køberen flytter ind, starter et nyt budget: ny ydelse, ejerudgifter, forsikringer og måske et lån, der skal betales ud. Giv budgetpro med i velkomsten, så de første måneder bliver rolige.",
      bullets: ["Fx 3 eller 6 måneder pr. plads", "Scenarier: hvad koster den nye bolig hver måned", "En hilsen, der bliver brugt efter handlen"],
    },
    {
      tag: "Skoler",
      title: "Privatøkonomi i udskolingen.",
      body: "budgetpro Skole er et færdigt forløb, hvor eleverne lægger et månedsbudget for en fremtidsperson. Skolen betaler pr. lærer, og lærerne opretter selv klasser med koder til eleverne.",
      bullets: ["Til 7.–9. klasse", "Eleverne logger ind med en kode, uden e-mail", "Læreren følger klassen undervejs"],
      link: { href: skoleUrl, label: "Gå til budgetpro Skole" },
    },
  ];
  return (
    <section id="brancher" className={`${styles.section} ${styles.stone}`} aria-labelledby="brancher-title">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={styles.eyebrow}>Brancher</span>
            <h2 id="brancher-title" className={styles.h2}>
              Til dem, der hjælper folk med store økonomiske valg.
            </h2>
          </div>
          <p className={styles.headBody}>
            Et lån, en bolig eller den første løn. Når kunden kender sit budget, bliver beslutningen bedre, og samtalen med
            jer lettere.
          </p>
        </div>
        <SwipeList className={e.sectorGrid} label="Brancher">
          {cards.map((c) => (
            <li key={c.tag} className={e.sector}>
              <span className={e.sectorTag}>{c.tag}</span>
              <h3 className={e.sectorTitle}>{c.title}</h3>
              <p className={e.sectorBody}>{c.body}</p>
              <CheckList items={c.bullets} className={e.sectorList} />
              {c.link ? (
                <a href={c.link.href} className={e.sectorLink}>
                  {c.link.label} <ArrowRightIcon size={14} />
                </a>
              ) : null}
            </li>
          ))}
        </SwipeList>
      </div>
    </section>
  );
}

const OTHERS = [
  { title: "Fagforeninger og a-kasser", body: "Som medlemsfordel, når økonomien ændrer sig ved jobskifte eller ledighed." },
  { title: "Arbejdsgivere", body: "Som personalegode, fx til elever og lærlinge, der får deres første løn." },
  { title: "Boligselskaber og udlejere", body: "Nye lejere får overblik over husleje og faste udgifter fra den første måned." },
  { title: "Kommuner og gældsrådgivning", body: "Et roligt sted at samle tallene for borgere, der skal i gang med et budget." },
  { title: "Advokater og familierådgivning", body: "Når én økonomi bliver til to, eller to bliver til én. Udgifterne kan fordeles efter indkomst." },
  { title: "Uddannelser", body: "Studerende på SU, der flytter hjemmefra og skal have pengene til at slå til." },
] as const;

function Others() {
  return (
    <section className={styles.section} aria-labelledby="andre-title">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={styles.eyebrow}>Andre brancher</span>
            <h2 id="andre-title" className={styles.h2}>
              Har jeres kunder også gavn af et overblik?
            </h2>
          </div>
          <p className={styles.headBody}>Aftalen virker ens for alle. Her er nogle, vi tror, det passer til. Skriv til os, hvis I ser jer selv et andet sted.</p>
        </div>
        <ul className={e.otherGrid} data-reveal-group>
          {OTHERS.map((o) => (
            <li key={o.title} className={e.other}>
              <h3 className={e.otherTitle}>{o.title}</h3>
              <p className={e.otherBody}>{o.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const TRUST_CARDS: readonly { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <LockIcon size={20} strokeWidth={1.8} />,
    title: "I ser aldrig kundens budget",
    body: "Som virksomhed ser I kun de e-mails, I har sendt til, og om adgangen er i brug. Ingen tal og ingen budgetter.",
  },
  {
    icon: <ShieldIcon size={20} strokeWidth={1.8} />,
    title: "Ingen kan se koderne",
    body: "Koden står kun i mailen til kunden. Hverken jeres administratorer eller budgetpro kan se den.",
  },
  {
    icon: <UploadIcon size={20} strokeWidth={1.8} />,
    title: "Ingen adgang til netbanken",
    body: "Kunden uploader selv en kontoudskrift eller skriver tallene ind. Intet hentes automatisk.",
  },
  {
    icon: <DownloadIcon size={20} strokeWidth={1.8} />,
    title: "Kundens data er kundens",
    body: "Alt kan eksporteres som PDF, Excel eller sikkerhedskopi, og kunden kan fortsætte på egen hånd.",
  },
];

function Trust() {
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
              I giver adgangen. Kunden bestemmer over tallene.
            </h2>
          </div>
          <p className={`${styles.headBody} ${styles.headBodyDark}`}>
            Et budget er privat. Derfor er aftalen bygget, så I kan give budgetpro videre uden at se, hvad kunden skriver.
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

const FAQ = [
  {
    q: "Hvad koster en aftale?",
    a: "Prisen afhænger af, hvor mange pladser I køber, og hvor længe hver plads gælder. Skriv til os, så får I et tilbud. Skoler betaler pr. lærer.",
  },
  {
    q: "Kan kunden se, at adgangen kommer fra os?",
    a: "Ja. Mailen med koden kommer fra budgetpro og siger, at adgangen er fra jer, og hvor mange måneder den gælder.",
  },
  {
    q: "Hvad sker der, når perioden slutter?",
    a: "Kunden beholder sit budget og kan selv fortsætte med et almindeligt abonnement. Pladsen bliver ikke fri igen, når den har været brugt.",
  },
  {
    q: "Hvad hvis vi skriver en forkert e-mail?",
    a: "Så trækker I adgangen tilbage, før den er brugt. Koden holder op med at virke, og pladsen bliver fri igen.",
  },
  {
    q: "Kan vi se det, før vi bestemmer os?",
    a: "Ja. Prøv demoen med en opdigtet familie, eller skriv til os, så viser vi jer både budgettet og siden, hvor I giver adgang.",
  },
] as const;

function Contact() {
  return (
    <section id="kontakt" className={styles.section} aria-labelledby="kontakt-title">
      <div className={`${styles.sectionInner} ${styles.pricingInner}`}>
        <div className={`${styles.priceCard} ${e.contactCard}`} data-reveal>
          <div className={styles.priceHead}>
            <span className={styles.eyebrow}>Kontakt</span>
          </div>
          <h2 id="kontakt-title" className={e.contactTitle}>
            Hør om en aftale
          </h2>
          <p className={e.contactLead}>Skriv lidt om jer, så vender vi tilbage på mail og finder en løsning, der passer.</p>
          <ContactForm />
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
          <Link href="/demobruger" className={e.demoLink}>
            Se demoen <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
