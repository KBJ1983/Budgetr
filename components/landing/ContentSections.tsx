import type { ReactNode } from "react";
import styles from "./landing.module.css";
import { CheckList } from "./CheckList";
import { AvailabilityCutout, SharingCutout } from "./cutouts";
import { PeopleIcon, UploadIcon, WandIcon } from "./icons";

const STEPS = [
  {
    icon: <PeopleIcon size={24} />,
    title: "Opret en gratis bruger",
    body: "Kun e-mail og en adgangskode. Bor I flere sammen, kan du invitere dem til det samme budget.",
  },
  {
    icon: <WandIcon size={24} />,
    title: "Følg guiden i 7 trin",
    body: "Dig og dem, du deler økonomi med, konti, faste udgifter og opsparingsmål. Korte svar, som kan rettes bagefter.",
  },
  {
    icon: <UploadIcon size={24} />,
    title: "Importér en kontoudskrift",
    body: "Upload CSV eller Excel fra netbanken. Ydelser opdateres, og stigninger bliver markeret.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="saadan" className={`${styles.section} ${styles.steps}`} aria-labelledby="saadan-title">
      <div className={styles.sectionHead}>
        <div className={styles.sectionHeadTitle}>
          <span className={styles.eyebrow}>Sådan virker det</span>
          <h2 id="saadan-title" className={styles.h2}>
            Fra tomt ark til fuldt overblik på en aften.
          </h2>
        </div>
        <p className={styles.headBody}>
          Ingen regneark at vedligeholde og ingen formler at forstå. Du svarer på nogle få spørgsmål, og budgettet
          bygger sig selv.
        </p>
      </div>
      <ol className={styles.stepGrid}>
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
            <div className={styles.stepText}>
              <h3 className={styles.stepTitle}>
                <span className={styles.stepPrefix} aria-hidden="true">
                  {index + 1}.{" "}
                </span>
                {step.title}
              </h3>
              <p className={styles.stepBody}>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

type SplitProps = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: readonly string[];
  visual: ReactNode;
  /** Cut-out on the left on desktop (text still comes first when stacked). */
  visualFirst?: boolean;
  tone?: "paper" | "stone";
};

/** Text + product cut-out, side by side on desktop, stacked below 1280px. */
function SplitSection({ id, eyebrow, title, body, bullets, visual, visualFirst = false, tone = "paper" }: SplitProps) {
  const titleId = `${id}-title`;
  return (
    <section
      className={[styles.section, styles.split, tone === "stone" ? styles.stone : "", visualFirst ? styles.splitReverse : ""]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={titleId}
    >
      <div className={styles.splitText}>
        <div className={styles.splitIntro}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h2 id={titleId} className={styles.h2}>
            {title}
          </h2>
          <p className={styles.bodyLg}>{body}</p>
        </div>
        <CheckList items={bullets} className={styles.splitList} />
      </div>
      <div className={styles.splitVisual}>{visual}</div>
    </section>
  );
}

export function Availability() {
  return (
    <SplitSection
      id="raadighed"
      eyebrow="Rådighed"
      title="Se, hvad du har til rådighed. Som banken ser det."
      body="Rådighedsbeløbet regnes, som banken gør, når I søger lån. Mad, opsparing og gaver holdes ude, så du kan se, om du ligger over eller under kravet."
      bullets={[
        "Nettoindtægt minus faste udgifter, måned for måned",
        "Se hvornår et lån udløber og giver luft i budgettet",
        "Klik på en post for at rette den med det samme",
      ]}
      visual={<AvailabilityCutout />}
    />
  );
}

export function Sharing() {
  return (
    <SplitSection
      id="deler"
      eyebrow="Deler du økonomi?"
      title="Bor I flere sammen? Så bliver det fair."
      body="Bor du alene, springer du det her over. Deler I udgifter, fordeles de efter indkomst, ligeligt eller med en fast procent, og overførslen til budgetkontoen regnes ud for jer."
      bullets={[
        "Automatiske overførsler, der følger fordelingen",
        "Egne udgifter og egen opsparing holdes for sig",
        "Besked, når en fast overførsel skal rettes i netbanken",
      ]}
      visual={<SharingCutout />}
      visualFirst
      tone="stone"
    />
  );
}
