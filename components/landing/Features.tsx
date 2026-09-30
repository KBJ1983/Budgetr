import type { ReactNode } from "react";
import styles from "./landing.module.css";
import { CheckList } from "./CheckList";
import { FeatureTour, type TourSlide } from "./FeatureTour";
import { BellIcon, BranchIcon, CalendarIcon, DownloadIcon, PlusIcon, TransferIcon, UploadIcon } from "./icons";

const icon = (node: ReactNode) => ({ kind: "icon", icon: node }) as const;

// The tour: photos for the plans, real screenshots (`pnpm shots`) where the app shows it best, an icon otherwise.
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
    body: "Hvad sker der, hvis I køber bolig, går på barsel eller skifter job? Hvert scenarie holdes op mod det nuværende budget.",
    visual: { kind: "photo", src: "/landing/foto-noegler.jpg", alt: "En familie, der får nøglerne til et nyt hjem", position: "center 45%" },
  },
  {
    label: "Lån",
    title: "Se, hvornår lånene er betalt ud.",
    body: "Restgæld, rente og ydelse giver en beregnet slutdato for hvert lån, og en tidslinje viser, hvor meget der frigives om måneden.",
    visual: { kind: "shot", name: "laan", alt: "Overblik over lån: samlet restgæld, ydelser og renter", width: 2360, height: 1474 },
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
    items: ["Restgæld, rente og beregnet slutdato for hvert lån", "Tidslinje over det, der frigives", "Opsparingsmål med dato eller fast beløb pr. måned", "Feriepenge og bonus som ekstra indbetalinger"],
  },
  {
    title: "Planlægning",
    items: ["Scenarier holdt op mod det nuværende budget", "Kladder med nye budgetter ved siden af det, du har", "Guide i 9 trin til et nyt budget"],
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

/** All the features in a dark band between the light sections: a sideways tour, and the full list to unfold. */
export function Features() {
  return (
    <section id="mere" className={`${styles.section} ${styles.featureBand}`} aria-labelledby="mere-title">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>Funktioner</span>
            <h2 id="mere-title" className={`${styles.h2} ${styles.h2Light}`}>
              Alt det, budgettet holder styr på.
            </h2>
          </div>
          <p className={`${styles.headBody} ${styles.headBodyDark}`}>
            Opsparing, lån, påmindelser og det, der ellers kræver et regneark. Bladr i funktionerne, eller se dem alle.
          </p>
        </div>
        <div data-reveal>
          <FeatureTour slides={SLIDES} />
        </div>
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
      </div>
    </section>
  );
}
