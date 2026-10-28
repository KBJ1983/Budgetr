import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/components/landing/landing.module.css";
import { Film } from "@/components/Film";
import { CheckList } from "@/components/landing/CheckList";
import { Features } from "@/components/landing/Features";
import { InPageLinks } from "@/components/landing/InPageLinks";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader, type NavLink } from "@/components/landing/SiteHeader";
import { SwipeList } from "@/components/landing/Swipe";
import { ArrowRightIcon, DownloadIcon, GlobeIcon, LockIcon, PlusIcon, ShieldIcon } from "@/components/landing/icons";
import { PriceRequest } from "./PriceRequest";
import e from "./erhverv.module.css";

const NAV_LINKS: readonly NavLink[] = [
  { href: "#hvad", label: "Hvad er budgetpro" },
  { href: "#brancher", label: "Brancher" },
  { href: "#pris", label: "Pris" },
  { href: "#mere", label: "Funktioner" },
];

const FOOTER_LINKS: readonly NavLink[] = [
  { href: "#hvad", label: "Hvad er budgetpro" },
  { href: "#brancher", label: "Brancher" },
  { href: "#pris", label: "Pris" },
  { href: "#mere", label: "Funktioner" },
];

/**
 * The Erhverv page (erhverv.<domain>, /erhverv), kept short: what budgetpro is (hero + a placeholder for a small
 * explainer animation), then the sectors and the price calculator, which only sends a price request; after that the
 * landing page's feature band ("Det får kunderne med budgetpro"), other sectors, trust and FAQ. Uses the landing page's styles and header, its photos plus public/erhverv/.
 */
export function ErhvervLanding() {
  return (
    <div className={styles.page}>
      <SiteHeader site="erhverv" links={NAV_LINKS} login={{ href: "/aftale", label: "Log ind" }} cta={{ href: "#pris", label: "Beregn pris" }} />
      <main>
        <Hero />
        <Explainer />
        <Sectors />
        <Pricing />
        <Features
          eyebrow="Funktioner"
          title="Det får kunderne med budgetpro."
          body="Det samme budgetpro som på budgetpro.dk: opsparingsmål, lån, scenarier, påmindelser og meget mere. Bladr i funktionerne, eller se dem alle."
        />
        <Others />
        <Trust />
        <Faq />
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
          <h1 id="hero-title" className={`${styles.h1} ${e.heroTitle}`}>
            Giv jeres kunder et budgetværktøj som en <span className={styles.accent}>kundefordel</span>.
          </h1>
          <p className={styles.lead}>
            budgetpro er et budgetværktøj på nettet. Kunden samler løn, faste udgifter, lån og opsparing ét sted og ser,
            hvad der er til rådighed hver måned. I giver adgangen, kunden får overblikket.
          </p>
          <div className={styles.heroActions}>
            <a href="#pris" className={styles.heroButton}>
              Beregn jeres pris <ArrowRightIcon size={16} />
            </a>
            <p className={styles.heroNote}>
              Har I allerede en aftale?{" "}
              <Link href="/aftale" className={e.heroLink}>
                Log ind og giv adgang
              </Link>
            </p>
          </div>
        </div>
        <div className={e.heroPhoto}>
          <Image
            src="/erhverv/foto-moede.jpg"
            alt="En rådgiver og to kunder ved et bord med papirer og bærbare computere"
            fill
            priority
            sizes="(max-width: 1019px) 100vw, 560px"
            className={styles.photoCover}
          />
        </div>
      </div>
    </section>
  );
}

const BEATS = [
  { title: "I giver adgang", body: "I skriver kundens e-mail, og kunden får en personlig kode fra budgetpro med jeres navn." },
  { title: "Kunden får overblik", body: "Løn, faste udgifter, lån og opsparing samles ét sted, og rådighedsbeløbet bliver regnet." },
  { title: "I mødes forberedte", body: "Kunden kender sine tal og kan sende budgettet som PDF eller Excel før mødet." },
] as const;

/**
 * What budgetpro Erhverv is, in short. The frame is a placeholder for a small animation; the three beats under it are
 * its script and stay as text when the animation comes.
 */
function Explainer() {
  return (
    <section id="hvad" className={`${styles.section} ${styles.white}`} aria-labelledby="hvad-title">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={styles.eyebrow}>Hvad er budgetpro</span>
            <h2 id="hvad-title" className={styles.h2}>
              Overblik til jeres kunder, uden arbejde for jer.
            </h2>
          </div>
          <p className={styles.headBody}>Der er intet at installere. I giver adgangen, resten klarer kunden og budgetpro.</p>
        </div>
        <Film name="erhverv" label="Film: sådan giver I jeres kunder budgetpro" />
        <ol className={e.beats} data-reveal-group>
          {BEATS.map((b, i) => (
            <li key={b.title} className={e.beat}>
              <span className={e.beatNum}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className={e.beatTitle}>{b.title}</h3>
              <p className={e.beatBody}>{b.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

type SectorCard = {
  tag: string;
  title: string;
  body: string;
  bullets: readonly string[];
  photo: { src: string; alt: string; position?: string };
};

function Sectors() {
  const cards: readonly SectorCard[] = [
    {
      tag: "Banker",
      title: "Kunder, der kommer forberedte til lånesamtalen.",
      body: "Rådighedsbeløbet i budgetpro regnes efter samme princip som bankernes: de faste udgifter trækkes fra, og mad, opsparing og gaver holdes ude. Giv adgang før mødet eller som en kundefordel til nye og faste kunder, så samtalen kan handle om rådgivning i stedet for at samle tal.",
      bullets: ["Fx 12 eller 24 måneder pr. kode", "Løn, lån, opsparing og rådighed ét sted", "Kunden deler selv budgettet som PDF eller Excel"],
      photo: { src: "/landing/foto-flytning.jpg", alt: "Et par, der flytter sammen, med flyttekasser", position: "50% 35%" },
    },
    {
      tag: "Ejendomsmæglere",
      title: "Et budget, der følger med nøglerne.",
      body: "Når køberen flytter ind, starter et nyt budget: ny ydelse, ejerudgifter, forsikringer og måske et lån, der skal betales ud. Giv budgetpro med i velkomsten, så de første måneder bliver rolige.",
      bullets: ["Fx 3 eller 6 måneder pr. kode", "Scenarier: hvad koster den nye bolig hver måned", "En hilsen, der bliver brugt efter handlen"],
      photo: { src: "/landing/foto-noegler.jpg", alt: "En familie, der holder nøglerne til deres nye bolig", position: "50% 45%" },
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
            Et lån eller en ny bolig. Når kunden kender sit budget, bliver beslutningen bedre, og samtalen med
            jer lettere.
          </p>
        </div>
        <SwipeList className={e.sectorGrid} label="Brancher">
          {cards.map((c) => (
            <li key={c.tag} className={e.sector}>
              <div className={e.sectorPhoto}>
                <Image src={c.photo.src} alt={c.photo.alt} fill sizes="(max-width: 1019px) 100vw, 380px" className={styles.photoCover} style={{ objectPosition: c.photo.position }} />
              </div>
              <div className={e.sectorText}>
                <span className={e.sectorTag}>{c.tag}</span>
                <h3 className={e.sectorTitle}>{c.title}</h3>
                <p className={e.sectorBody}>{c.body}</p>
                <CheckList items={c.bullets} className={e.sectorList} />
              </div>
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
    icon: <GlobeIcon size={20} strokeWidth={1.8} />,
    title: "Data bliver i EU",
    body: "Budgetter og brugere opbevares på servere i EU. Intet hentes fra netbanken, kunden lægger selv tallene ind.",
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

function Pricing() {
  return (
    <section id="pris" className={styles.section} aria-labelledby="pris-title">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={styles.eyebrow}>Pris</span>
            <h2 id="pris-title" className={styles.h2}>
              Beregn jeres pris.
            </h2>
          </div>
          <p className={styles.headBody}>
            Vælg antal koder og hvor længe de gælder. Prisen vises pr. måned, og I kan se den pr. år. Send en forespørgsel,
            så får I et tilbud. Det binder jer ikke til noget.
          </p>
        </div>
        <div data-reveal>
          <PriceRequest />
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: "Hvad koster en aftale?",
    a: "Det afhænger af antal koder og hvor længe de gælder. Fx koster 50 koder med 12 måneder 7.200 kr i alt inkl. moms, svarende til 600 kr om måneden. Jo flere koder og jo længere tid, jo lavere pris pr. kunde. Skal I bruge flere end 200 koder, så skriv til os i formularen. Skoler har deres egen pris på budgetpro Skole.",
  },
  {
    q: "Hvorfor give budgetpro som en kundefordel?",
    a: "Fordi det er en fordel, kunden bruger. Et budget med mål for det, de drømmer om, åbner de igen og igen, og de kommer bedre forberedte til jer. Mailen med koden siger, at adgangen er fra jer.",
  },
  {
    q: "Har vi lavet en aftale, når vi sender en prisforespørgsel?",
    a: "Nej. En prisforespørgsel er kun en forespørgsel. Vi skriver til jer med et tilbud, og aftalen bliver først lavet, når I har sagt ja.",
  },
  {
    q: "Kan kunden se, at adgangen kommer fra os?",
    a: "Ja. Mailen med koden kommer fra budgetpro og siger, at adgangen er fra jer, og hvor mange måneder den gælder.",
  },
  {
    q: "Hvad sker der, når perioden slutter?",
    a: "Kunden beholder sit budget og kan selv fortsætte med et almindeligt abonnement. En kode bliver ikke fri igen, når den har været brugt.",
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

/** Intro and demo link on the left, the questions as a quiet list with thin rules on the right. */
function Faq() {
  return (
    <section id="faq" className={`${styles.section} ${styles.stone}`} aria-labelledby="faq-title">
      <div className={`${styles.sectionInner} ${e.faqWrap}`}>
        <div className={e.faqIntro} data-reveal>
          <span className={styles.eyebrow}>Spørgsmål og svar</span>
          <h2 id="faq-title" className={styles.h2}>
            Det, I typisk spørger om.
          </h2>
          <p className={e.faqLead}>Finder I ikke svaret, så skriv til os i prisberegneren. Vi svarer selv, og det binder jer ikke.</p>
          <Link href="/demobruger" className={e.demoLink}>
            Se demoen <ArrowRightIcon size={14} />
          </Link>
        </div>
        <div className={e.faqList} data-reveal>
          {FAQ.map((item) => (
            <details key={item.q} className={e.faqItem} name="faq">
              <summary className={e.faqQ}>
                <span>{item.q}</span>
                <span className={e.faqIcon} aria-hidden="true">
                  <PlusIcon size={14} strokeWidth={2} />
                </span>
              </summary>
              <p className={e.faqA}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
