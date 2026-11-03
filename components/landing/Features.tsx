import type { ReactNode } from "react";
import styles from "./landing.module.css";
import { CheckList } from "./CheckList";
import { FeatureTour, type TourSlide } from "./FeatureTour";
import { BellIcon, BranchIcon, CalendarIcon, DownloadIcon, LoanIcon, PlusIcon, TransferIcon, UploadIcon } from "./icons";

const icon = (node: ReactNode) => ({ kind: "icon", icon: node }) as const;

// The tour: photos for the plans, drawn loans, real screenshots (`pnpm shots`) where the app shows it best, an icon otherwise.
const SLIDES: readonly TourSlide[] = [
  {
    label: "Opsparingsmål",
    title: "Giv drømmen en dato.",
    body: "Et fast beløb til en dato, eller en fast månedlig indbetaling. Feriepenge og bonus kan lægges ind som ekstra indbetalinger.",
    visual: { kind: "photo", src: "/landing/foto-strand.jpg", alt: "En familie på stranden i solnedgang", position: "center 70%" },
  },
  {
    label: "Scenarier",
    title: "Kend rådigheden, før I byder.",
    body: "Opret et scenarie og prøv en ændring uden at røre budgettet: bolig, barsel eller nyt job. Hvert scenarie holdes op mod det nuværende budget.",
    visual: { kind: "photo", src: "/landing/foto-noegler.jpg", alt: "En familie, der får nøglerne til et nyt hjem", position: "center 45%" },
  },
  {
    label: "Lån",
    title: "Se, hvornår lånene er betalt ud.",
    body: "Restgæld, rente og ydelse giver en beregnet slutdato for hvert lån, og en tidslinje viser, hvor meget der frigives om måneden.",
    visual: {
      kind: "loans",
      loans: [
        { name: "Billån", end: "jun 2027", paid: 72 },
        { name: "Studielån", end: "mar 2032", paid: 47 },
        { name: "Realkredit", end: "aug 2044", paid: 22 },
      ],
    },
  },
  {
    label: "Fremskriv lån",
    title: "Hvad skylder I om fem år?",
    body: "Vælg en dato, og se hvad restgælden på hvert lån er nede på til den tid, regnet ud fra restgæld, rente og ydelse.",
    visual: icon(<LoanIcon size={34} strokeWidth={1.5} />),
  },
  {
    label: "Budgetposter",
    title: "Alle faste poster ét sted.",
    body: "Omregnet til pr. måned, uanset hvor tit de betales. Stigninger bliver markeret, når du importerer en kontoudskrift.",
    visual: { kind: "shot", name: "poster", alt: "Budgetposter: indtægter og faste udgifter i kategorier", width: 2360, height: 1474 },
  },
  {
    label: "Milepæle",
    title: "Besked, når I når et mål.",
    body: "Ved 10, 25, 50, 75 og 100 % af et opsparingsmål får du en besked, næste gang du logger ind.",
    visual: { kind: "shot", name: "besked", alt: "Beskeden ved login: et opsparingsmål har nået 50 %", width: 1040, height: 972 },
  },
  {
    label: "Påmindelser",
    title: "Påmindelse, når budgettet trænger.",
    body: "Hver måned, hver 3. måned, hvert halve år eller en gang om året, hvis budgettet ikke er rettet. I appen, på mail eller sms.",
    visual: { kind: "shot", name: "paamind", alt: "Indstillinger, Påmindelser", width: 1840, height: 1260 },
  },
  {
    label: "Opgaver",
    title: "Noter, hvad der skal gøres.",
    body: "Skriv en opgave på en post eller en konto. Åbne opgaver samles under klokken, og du bliver mindet om dem, hvis de bliver liggende.",
    visual: icon(<BellIcon size={34} strokeWidth={1.5} />),
  },
  {
    label: "Faste overførsler",
    title: "Pengene, der flytter sig selv.",
    body: "Se alle pengestrømme mellem dine konti, og få besked, når en overførsel ikke længere passer til fordelingen.",
    visual: icon(<TransferIcon size={34} strokeWidth={1.5} />),
  },
  {
    label: "Kladder",
    title: "Et nyt budget ved siden af.",
    body: "Byg et nyt budget, fx når to økonomier skal lægges sammen. Det, du har nu, er uændret, til du skifter.",
    visual: icon(<BranchIcon size={34} strokeWidth={1.5} />),
  },
  {
    label: "Kontoudskrifter",
    title: "Hent de nyeste beløb ind.",
    body: "Upload CSV, Excel eller PDF fra netbanken. Posteringer genkendes på aftalenummer og tekst, og du vælger selv, hvad der opdateres.",
    visual: icon(<UploadIcon size={34} strokeWidth={1.5} />),
  },
  {
    label: "Måned for måned",
    title: "Saldoen på hver konto.",
    body: "Se ind, ud og saldo på hver konto måned for måned, og få besked, hvis en konto kommer i minus i løbet af året.",
    visual: icon(<CalendarIcon size={34} strokeWidth={1.5} />),
  },
  {
    label: "Eksport",
    title: "Dine tal, når du vil have dem.",
    body: "Eksportér budgettet som PDF eller Excel, eller gem en sikkerhedskopi af det hele.",
    visual: icon(<DownloadIcon size={34} strokeWidth={1.5} />),
  },
];

// The classic list behind "Se alle funktioner". Only what the app does today.
const ALL: readonly { title: string; items: readonly string[] }[] = [
  {
    title: "Overblik",
    items: ["Tilbage pr. måned efter faste udgifter og opsparing", "Rådighedsbeløbet, som banken regner det", "Saldo på hver konto måned for måned", "Lyst og mørkt tema"],
  },
  {
    title: "Poster og konti",
    items: ["Ubegrænset antal poster, konti og lån", "Beløb omregnet til pr. måned", "Import af kontoudskrifter som CSV, Excel eller PDF", "Stigninger markeres, og det gamle beløb gemmes"],
  },
  {
    title: "Sammen",
    items: ["Del budgettet med op til to andre", "Fordeling efter indkomst, ligeligt eller med en fast procent", "Automatiske overførsler til budgetkontoen", "Egne udgifter og egen opsparing holdes for sig"],
  },
  {
    title: "Lån og opsparing",
    items: ["Restgæld, rente og beregnet slutdato for hvert lån", "Fremskriv restgælden til en dato, du vælger", "Tidslinje over det, der frigives", "Opsparingsmål med dato eller fast beløb pr. måned", "Feriepenge og bonus som ekstra indbetalinger"],
  },
  {
    title: "Planlægning",
    items: ["Opret scenarier og hold dem op mod det nuværende budget", "Kladder med nye budgetter ved siden af det, du har", "Guide i 9 trin til et nyt budget"],
  },
  {
    title: "Beskeder",
    items: ["Besked ved 10, 25, 50, 75 og 100 % af et mål", "Påmindelse om at se budgettet igennem", "Opgaver på poster og konti", "Også på mail eller sms, hvis du vil"],
  },
  {
    title: "Dine data",
    items: ["Eksport til PDF og Excel", "Sikkerhedskopi, du kan gendanne", "Ingen adgang til netbanken", "Log ind med en kode på mail"],
  },
];

type FeaturesHead = { eyebrow?: string; title?: string; body?: string };

/**
 * All the features in one section on the mynte tint: a sideways tour of cards (photos, drawn loans, real screenshots,
 * icons), then – with `mosaic` (the front page) – the coloured mosaic, and at the bottom the full list behind the plus
 * ("Se alle funktioner"). The Erhverv page passes its own head ("Det får kunderne med budgetpro") and no mosaic.
 */
export function Features({
  eyebrow = "Funktioner",
  title = "Alt det, budgettet holder styr på.",
  body = "Opsparing, lån, påmindelser og det, der ellers kræver et regneark. Bladr i funktionerne, eller se dem alle.",
  mosaic = false,
}: FeaturesHead & { mosaic?: boolean } = {}) {
  return (
    <section id="mere" className={`${styles.section} ${styles.featureBand}`} aria-labelledby="mere-title">
      <div className={styles.allCircle} aria-hidden="true" />
      <div className={styles.allShape} aria-hidden="true" />
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h2 id="mere-title" className={styles.h2}>
              {title}
            </h2>
          </div>
          <p className={styles.headBody}>{body}</p>
        </div>
        <div data-reveal>
          <FeatureTour slides={SLIDES} />
        </div>
        {mosaic && <Mosaic />}
        <AllList />
      </div>
    </section>
  );
}

/** "Se alle funktioner": the full list, folded away behind a plus. */
function AllList() {
  return (
    <details className={styles.allFeatures}>
      <summary className={styles.allFeaturesToggle}>
        <span className={styles.allShow}>Se alle funktioner</span>
        <span className={styles.allHide}>Skjul listen</span>
        <span className={styles.faqPlus} aria-hidden="true">
          <PlusIcon size={14} strokeWidth={2.2} />
        </span>
      </summary>
      <div className={styles.allGrid}>
        {ALL.map((g) => (
          <div key={g.title} className={styles.allGroup}>
            <h3 className={styles.allTitle}>{g.title}</h3>
            <CheckList items={g.items} className={styles.allList} />
          </div>
        ))}
      </div>
    </details>
  );
}

type Tone = "white" | "mint" | "deep" | "ink" | "coral";
type Cell = { tone: Tone; over: string; title: string; body: string; pic?: ReactNode; wide?: boolean };

// Which months a quarterly, a half-yearly and a yearly bill fall in (Budgetposter card).
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;
const PAY: Record<number, "ink" | "deep"> = { 0: "ink", 3: "ink", 5: "deep", 6: "ink", 9: "ink", 11: "deep" };

// Only what the app does today. Numbers are the fictional demo family's (lib/demo-customer.ts).
const CELLS: readonly Cell[] = [
  {
    tone: "mint",
    wide: true,
    over: "Budgetposter",
    title: "Betalinger i de rigtige måneder",
    body: "Alle faste udgifter med hyppighed, konto og betaler. Kvartals- og årsbetalinger lander præcis, hvor de falder.",
    pic: (
      <div className={styles.bentoMonths}>
        {MONTHS.map((m, i) => (
          <span key={i}>
            <i data-pay={PAY[i]} />
            {m}
          </span>
        ))}
      </div>
    ),
  },
  {
    tone: "deep",
    over: "Import",
    title: "Budgetkladde fra kontoudskriften",
    body: "Upload en kontoudskrift eller et budget fra Excel, og få et udkast til budgettet.",
    pic: (
      <div className={styles.bentoChips}>
        <span>CSV</span>
        <span>Excel</span>
        <span>PDF</span>
      </div>
    ),
  },
  {
    tone: "white",
    over: "Rådighed",
    title: "Som banken regner det",
    body: "Nettoindtægt minus bankens faste udgifter. Kan tilpasses din banks retningslinjer.",
    pic: <span className={styles.bentoBig}>28.557 kr</span>,
  },
  {
    tone: "ink",
    over: "Deling",
    title: "Hvem betaler hvad",
    body: "Fordel faste udgifter efter indkomst, ligeligt eller med en fast procent.",
    pic: (
      <span className={styles.splitBar}>
        <span style={{ width: "55%" }}>Sofie 55 %</span>
        <span>Mikkel 45 %</span>
      </span>
    ),
  },
  {
    tone: "white",
    over: "Konti",
    title: "Hver konto for sig",
    body: "Se, hvad der løber ind og ud, og om kontoen er dækket.",
    pic: (
      <div className={styles.bentoRows}>
        <span>
          Budgetkonto <i>Dækket</i>
        </span>
        <span>
          Mikkel – lønkonto <i data-neg="">−3.352 kr</i>
        </span>
      </div>
    ),
  },
  {
    tone: "coral",
    over: "Overførsler",
    title: "Besked, når netbanken skal rettes",
    body: "Ændrer budgettet sig, regnes de faste overførsler om, og du får besked.",
    pic: <span className={styles.bentoPill}>2 skal rettes</span>,
  },
  {
    tone: "mint",
    over: "Scenarier",
    title: "Prøv, før I beslutter",
    body: "Flytning, barsel, nyt job eller et nyt lån. Hvert scenarie holdes op mod det nuværende budget.",
    pic: (
      <div className={styles.bentoScen}>
        <span>Nuværende</span>
        <span data-on="">Nyt hus</span>
        <span>Barsel Sofie</span>
      </div>
    ),
  },
  {
    tone: "white",
    over: "Lån",
    title: "Restgæld og udløb",
    body: "Se ydelse, renter og den måned, hvor hvert lån er betalt ud og frigiver penge.",
    pic: (
      <span className={styles.bentoTrack}>
        <span />
      </span>
    ),
  },
  {
    tone: "deep",
    over: "Månedstjek",
    title: "Fem minutter om måneden",
    body: "En påmindelse på mail, og et tjek af det, der har ændret sig siden sidst.",
    pic: <span className={`${styles.bentoPill} ${styles.bentoPillFill}`}>Budgettet passer</span>,
  },
  {
    tone: "white",
    over: "Eksport",
    title: "Dine data er dine",
    body: "PDF, Excel eller sikkerhedskopi, når som helst.",
  },
];

const TONE: Record<Tone, string | undefined> = {
  white: styles.bentoWhite,
  mint: styles.bentoMint,
  deep: styles.bentoDeep,
  ink: styles.bentoInk,
  coral: styles.bentoCoral,
};

/** Every main feature as a mosaic of coloured cards, each with a small drawing (design "Mynte og is komplet"). */
function Mosaic() {
  return (
    <ul className={styles.bento} data-reveal-group>
      {CELLS.map((c) => (
        <li key={c.over} className={[styles.bentoCard, TONE[c.tone], c.wide ? styles.bentoWide : ""].join(" ")}>
          <span className={styles.bentoOver}>{c.over}</span>
          <h3 className={styles.bentoTitle}>{c.title}</h3>
          <p className={styles.bentoBody}>{c.body}</p>
          {c.pic && (
            <div className={styles.bentoPic} aria-hidden="true">
              {c.pic}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
