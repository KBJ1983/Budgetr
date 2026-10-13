import Image from "next/image";
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
import { CHEAPEST, PRIVATE_MONTHLY } from "@/lib/erhverv-packs";
import { PriceRequest } from "./PriceRequest";
import e from "./erhverv.module.css";

const NAV_LINKS: readonly NavLink[] = [
  { href: "#kundefordel", label: "Kundefordel" },
  { href: "#forberedt", label: "Forberedte kunder" },
  { href: "#saadan", label: "Sådan virker det" },
  { href: "#brancher", label: "Brancher" },
  { href: "#pris", label: "Pris" },
];

const FOOTER_LINKS: readonly NavLink[] = [
  { href: "#kundefordel", label: "Kundefordel" },
  { href: "#forberedt", label: "Forberedte kunder" },
  { href: "#saadan", label: "Sådan virker det" },
  { href: "#brancher", label: "Brancher" },
  { href: "#pris", label: "Pris" },
];

/**
 * The Erhverv page (erhverv.<domain>, /erhverv): banks, estate agents, schools and others give their customers budgetpro
 * as a customer benefit – an easy overview of their money and a plan for what they dream of – so they also come
 * prepared, through an agreement
 * (docs/plans/2026-10-13-aftaler-adgang.md). Uses the landing page's styles and header, its photos plus the meeting
 * photo in public/erhverv/, a drawn miniature of the kundeadmin page /aftale (made-up e-mails) and the price
 * calculator, which only sends a price request.
 */
export function ErhvervLanding({ skoleUrl }: { skoleUrl: string }) {
  return (
    <div className={styles.page}>
      <SiteHeader site="erhverv" links={NAV_LINKS} login={{ href: "/aftale", label: "Log ind" }} cta={{ href: "#pris", label: "Beregn pris" }} />
      <main>
        <Hero />
        <Usp />
        <Benefit />
        <Prepared />
        <Steps />
        <Sectors skoleUrl={skoleUrl} />
        <Others />
        <Trust />
        <Pricing />
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
            Med budgetpro får jeres kunder et nemt overblik over løn, faste udgifter, lån og opsparing, og en plan for det,
            de drømmer om. Så kommer de forberedte til mødet, og I kan bruge tiden på rådgivning i stedet for at lede efter
            tal.
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

/** The USP band under the hero: the lowest price per customer, taken from the price list so it never drifts. */
function Usp() {
  return (
    <section className={e.uspWrap} aria-labelledby="usp-title">
      <div className={e.usp} data-reveal>
        <div className={e.uspText}>
          <h2 id="usp-title" className={e.uspTitle}>
            Vil I give jeres kunder en kæmpe fordel for {CHEAPEST.rate} kr om måneden?
          </h2>
          <p className={e.uspBody}>
            Fra {CHEAPEST.rate} kr pr. kunde om måneden med {CHEAPEST.count} koder i {CHEAPEST.months} måneder. Privat koster
            budgetpro {PRIVATE_MONTHLY} kr om måneden.
          </p>
        </div>
        <div className={e.uspPrice}>
          <span className={e.uspFrom}>Fra</span>
          <b className={e.uspAmount}>{CHEAPEST.rate} kr</b>
          <span className={e.uspUnit}>pr. kunde om måneden</span>
          <a href="#pris" className={e.uspButton}>
            Beregn jeres pris <ArrowRightIcon size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

const DREAMS = [
  {
    tag: "Drømmen",
    title: "Huset med haven",
    body: "Kunden sætter et mål for udbetalingen og ser, hvor meget der skal lægges til side hver måned for at nå det.",
  },
  {
    tag: "Drømmen",
    title: "Rejsen, de har talt om",
    body: "Et beløb og en dato gør rejsen til en plan. Feriepenge og bonus kan lægges ind som ekstra indbetalinger.",
  },
  {
    tag: "Drømmen",
    title: "Ro i maven",
    body: "En buffer til det uventede og lån, der bliver mindre måned for måned. Kunden kan se, hvornår de er betalt ud.",
  },
] as const;

/** Why give budgetpro away: a benefit the customer uses every month, built around their own dreams. */
function Benefit() {
  return (
    <section id="kundefordel" className={`${styles.section} ${styles.stone}`} aria-labelledby="kundefordel-title">
      <div className={styles.sectionInner}>
        <div className={styles.split}>
          <div className={styles.splitText} data-reveal>
            <div className={styles.splitIntro}>
              <span className={styles.eyebrow}>En kundefordel</span>
              <h2 id="kundefordel-title" className={styles.h2}>
                Overblik i dag. En plan for drømmene i morgen.
              </h2>
              <p className={styles.bodyLg}>
                De fleste kunder har noget, de sparer op til eller drømmer om. Med budgetpro fra jer kan de se, hvad der er
                til rådighed, og hvad der skal til for at nå det. Det er en fordel, de bruger hver måned, ikke kun den dag,
                de får den.
              </p>
            </div>
            <CheckList
              items={[
                "En fordel, kunden har glæde af hver måned",
                "Opsparingsmål med beløb og dato for det, kunden drømmer om",
                "Scenarier viser, hvad en ny bolig eller et nyt lån betyder",
                "Adgangen kommer fra jer, så overblikket hænger sammen med jer",
              ]}
              className={styles.splitList}
            />
          </div>
          <div className={`${styles.splitVisual} ${e.preparedPhoto}`} data-reveal>
            <Image
              src="/landing/foto-strand.jpg"
              alt="En familie på stranden i solnedgang"
              fill
              sizes="(max-width: 1019px) 100vw, 560px"
              className={styles.photoCover}
              style={{ objectPosition: "center 70%" }}
            />
          </div>
        </div>
        <ul className={e.journey} data-reveal-group>
          {DREAMS.map((d) => (
            <li key={d.title} className={e.journeyStep}>
              <span className={e.journeyWhen}>{d.tag}</span>
              <h3 className={e.journeyTitle}>{d.title}</h3>
              <p className={e.journeyBody}>{d.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const JOURNEY = [
  {
    when: "Før mødet",
    title: "Overblik derhjemme",
    body: "Kunden lægger budgettet i ro og mag, alene eller sammen med dem, de bor med. Guiden tager omkring en halv time.",
  },
  {
    when: "Til mødet",
    title: "Tallene er klar",
    body: "Rådighedsbeløbet er regnet, som banken gør. Kunden kan sende budgettet som PDF eller Excel på forhånd.",
  },
  {
    when: "Efter mødet",
    title: "Budgettet følger med",
    body: "Et nyt lån, en ny bolig eller en ny løn lægges ind, og kunden ser med det samme, hvad det betyder hver måned.",
  },
] as const;

/** The emotional core: customers who know their numbers come prepared, and the meeting changes. */
function Prepared() {
  return (
    <section id="forberedt" className={styles.section} aria-labelledby="forberedt-title">
      <div className={styles.sectionInner}>
        <div className={`${styles.split} ${styles.splitReverse}`}>
          <div className={styles.splitText} data-reveal>
            <div className={styles.splitIntro}>
              <span className={styles.eyebrow}>Forberedte kunder</span>
              <h2 id="forberedt-title" className={styles.h2}>
                Når kunden kender sine tal, bliver mødet et andet.
              </h2>
              <p className={styles.bodyLg}>
                Mange kommer til et møde om lån eller bolig med en fornemmelse og en bunke papirer. Med budgetpro har de
                gjort arbejdet derhjemme, og de møder op med ro i maven og overblik over, hvad de har til rådighed.
              </p>
            </div>
            <CheckList
              items={[
                "Kunden kender sit rådighedsbeløb, før I mødes",
                "Lån, faste udgifter og opsparing er samlet ét sted",
                "Mindre tid på at finde tal, mere tid til de gode råd",
                "Kunden føler sig klædt på, ikke på prøve",
              ]}
              className={styles.splitList}
            />
          </div>
          <div className={`${styles.splitVisual} ${e.preparedPhoto}`} data-reveal>
            <Image
              src="/landing/foto-sofa.jpg"
              alt="Et par i sofaen, der ser på deres budget sammen på den bærbare"
              fill
              sizes="(max-width: 1019px) 100vw, 560px"
              className={styles.photoCover}
            />
          </div>
        </div>
        <ol className={e.journey} data-reveal-group>
          {JOURNEY.map((j) => (
            <li key={j.when} className={e.journeyStep}>
              <span className={e.journeyWhen}>{j.when}</span>
              <h3 className={e.journeyTitle}>{j.title}</h3>
              <p className={e.journeyBody}>{j.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: <PeopleIcon size={22} strokeWidth={1.7} />,
    title: "Vi laver en aftale",
    body: "I vælger, hvor mange koder I vil have, og hvor mange måneder hver kode gælder. Koderne kan sendes ud i et år.",
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
        <div className={e.how}>
          <ol className={e.howSteps} data-reveal-group>
            {STEPS.map((step, index) => (
              <li key={step.title} className={e.howStep}>
                <span className={styles.stepIcon} aria-hidden="true">
                  {step.icon}
                </span>
                <div>
                  <h3 className={styles.stepTitle}>
                    <span className={e.howNum}>{String(index + 1).padStart(2, "0")}</span> {step.title}
                  </h3>
                  <p className={styles.stepBody}>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <AdminMock />
        </div>
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
    <figure className={e.mock} aria-label="Eksempel: sådan ser det ud, når I giver adgang" data-reveal>
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

type SectorCard = {
  tag: string;
  title: string;
  body: string;
  bullets: readonly string[];
  photo: { src: string; alt: string; position?: string };
  link?: { href: string; label: string };
};

function Sectors({ skoleUrl }: { skoleUrl: string }) {
  const cards: readonly SectorCard[] = [
    {
      tag: "Banker",
      title: "Kunder, der kommer forberedte til lånesamtalen.",
      body: "Rådighedsbeløbet i budgetpro regnes, som banken gør. Giv adgang før mødet eller som en kundefordel til nye og faste kunder, så samtalen kan handle om rådgivning i stedet for at samle tal.",
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
    {
      tag: "Skoler",
      title: "Privatøkonomi i udskolingen.",
      body: "budgetpro Skole er et færdigt forløb, hvor eleverne lægger et månedsbudget for en fremtidsperson. Skolen betaler pr. lærer, og lærerne opretter selv klasser med koder til eleverne.",
      bullets: ["Til 7.–9. klasse", "Eleverne logger ind med en kode, uden e-mail", "Læreren følger klassen undervejs"],
      photo: { src: "/skole/klasse.jpg", alt: "Elever og lærer ved bærbare computere i klasselokalet" },
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
              <div className={e.sectorPhoto}>
                <Image src={c.photo.src} alt={c.photo.alt} fill sizes="(max-width: 1019px) 100vw, 380px" className={styles.photoCover} style={{ objectPosition: c.photo.position }} />
              </div>
              <div className={e.sectorText}>
                <span className={e.sectorTag}>{c.tag}</span>
                <h3 className={e.sectorTitle}>{c.title}</h3>
                <p className={e.sectorBody}>{c.body}</p>
                <CheckList items={c.bullets} className={e.sectorList} />
                {c.link ? (
                  <a href={c.link.href} className={e.sectorLink}>
                    {c.link.label} <ArrowRightIcon size={14} />
                  </a>
                ) : null}
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
    a: "Det afhænger af antal koder og hvor længe de gælder. Fx koster 50 koder med 12 måneder 600 kr om måneden, eller 7.200 kr betalt årligt. Jo flere koder og jo længere tid, jo lavere pris pr. kunde. Skal I bruge flere end 200 koder, så skriv til os i formularen. Skoler betaler pr. lærer.",
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

function Faq() {
  return (
    <section className={`${styles.section} ${styles.stone}`} aria-labelledby="faq-title">
      <div className={`${styles.sectionInner} ${e.faqInner}`}>
        <div className={styles.faq} data-reveal-group>
          <h2 id="faq-title" className={`${styles.h2} ${styles.faqTitle}`}>
            Spørgsmål og svar
          </h2>
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
