import styles from "./landing.module.css";
import { ImportCutout, SavingsCutout, ScenarioCutout, TransfersCutout } from "./cutouts";

const FEATURES = [
  {
    title: "Opsparingsmål",
    body: "Et fast beløb til en dato, eller en fast månedlig indbetaling. Feriepenge og bonus kan lægges ind som ekstra indbetalinger.",
    visual: <SavingsCutout />,
  },
  {
    title: "Scenarier",
    body: "Hvad sker der, hvis du køber bolig, går på barsel eller skifter job? Hvert scenarie holdes op mod det nuværende budget.",
    visual: <ScenarioCutout />,
  },
  {
    title: "Faste overførsler",
    body: "Se alle pengestrømme mellem dine konti, og få besked, når en overførsel ikke længere passer.",
    visual: <TransfersCutout />,
  },
] as const;

const IMPORT_PILLS = ["CSV og Excel", "Genkendes på aftalenr.", "Stigninger markeres", "Nye faste betalinger foreslås"] as const;

/** "Alt det andet" – the dark Ink section. */
export function Features() {
  return (
    <section id="funktioner" className={`${styles.section} ${styles.features}`} aria-labelledby="funktioner-title">
      <div className={styles.sectionHead}>
        <div className={styles.sectionHeadTitle}>
          <span className={`${styles.eyebrow} ${styles.eyebrowLight}`}>Alt det andet</span>
          <h2 id="funktioner-title" className={`${styles.h2} ${styles.h2Light}`}>
            Opsparing, scenarier og det, der ændrer sig.
          </h2>
        </div>
        <p className={`${styles.headBody} ${styles.headBodyDark}`}>
          Planlæg det næste skridt uden at røre det budget, du lever efter i dag.
        </p>
      </div>
      <div className={styles.featureGrid}>
        {FEATURES.map((feature) => (
          <div key={feature.title} className={styles.featureCol}>
            {feature.visual}
            <div className={styles.featureCaption}>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureBody}>{feature.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.importWide}>
        <ImportCutout />
        <div className={styles.importPitch}>
          <h3 className={styles.importPitchTitle}>Upload kontoudskriften. Vi finder ændringerne.</h3>
          <p className={styles.importPitchBody}>
            Posteringer genkendes på aftalenummer og tekst. Du vælger selv, hvad der opdateres, og det gamle beløb gemmes,
            så du kan se udviklingen over tid.
          </p>
          <ul className={styles.featurePills}>
            {IMPORT_PILLS.map((pill) => (
              <li key={pill}>{pill}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
