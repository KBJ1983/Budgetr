import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import styles from "./landing.module.css";
import { CheckList } from "./CheckList";
import { ShotFrame, ThemeShot } from "./Shots";
import { SwipeList } from "./Swipe";
import { BellIcon, CalendarIcon, PeopleIcon, TargetIcon, UploadIcon, WandIcon } from "./icons";

const STEPS = [
  {
    icon: <PeopleIcon size={22} strokeWidth={1.7} />,
    title: "Start din gratis prøveperiode",
    body: "Kun e-mail og en adgangskode. 30 dage gratis. Bor I flere sammen, kan du invitere dem til det samme budget.",
  },
  {
    icon: <WandIcon size={22} strokeWidth={1.7} />,
    title: "Følg guiden i 7 trin",
    body: "Dig og dem, du deler økonomi med, konti, faste udgifter og opsparingsmål. Korte svar, som kan rettes bagefter.",
  },
  {
    icon: <UploadIcon size={22} strokeWidth={1.7} />,
    title: "Importér en kontoudskrift",
    body: "Upload CSV eller Excel fra netbanken. Ydelser opdateres, og stigninger bliver markeret.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="saadan" className={`${styles.section} ${styles.steps}`} aria-labelledby="saadan-title">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={styles.eyebrow}>Sådan virker det</span>
            <h2 id="saadan-title" className={styles.h2}>
              Fra tomt ark til fuldt overblik på 29 min.
            </h2>
          </div>
          <p className={styles.headBody}>
            Ingen regneark at vedligeholde og ingen formler at forstå. Du svarer på nogle få spørgsmål, og budgettet
            bygger sig selv.
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

/** Wide photo with a short line of text, between "Sådan virker det" and Tryghed. */
export function PhotoBanner() {
  return (
    <section className={styles.bannerWrap} aria-labelledby="banner-title">
      <div className={styles.banner} data-reveal>
        <Image
          src="/landing/foto-sofa.jpg"
          alt="Et par i sofaen, der ser på budgettet sammen på den bærbare"
          fill
          sizes="(max-width: 1344px) 100vw, 1280px"
          className={styles.bannerImage}
        />
        <div className={styles.bannerShade} aria-hidden="true" />
        <div className={styles.bannerText}>
          <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>Invester 29 minutter</span>
          <h2 id="banner-title" className={styles.bannerTitle}>
            Ro i økonomien. Ro i livet.
          </h2>
          <p className={styles.bannerBody}>Når I kender tallene, bliver der mere tid til det, der betyder noget.</p>
        </div>
      </div>
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
  /** Visual on the left on desktop (text still comes first when stacked). */
  visualFirst?: boolean;
  tone?: "paper" | "stone";
};

/** Text + a screenshot of the app, side by side on desktop, stacked on narrow screens. */
function SplitSection({ id, eyebrow, title, body, bullets, visual, visualFirst = false, tone = "paper" }: SplitProps) {
  const titleId = `${id}-title`;
  return (
    <section id={id} className={`${styles.section} ${tone === "stone" ? styles.stone : ""}`} aria-labelledby={titleId}>
      <div className={`${styles.sectionInner} ${styles.split} ${visualFirst ? styles.splitReverse : ""}`}>
        <div className={styles.splitText} data-reveal>
          <div className={styles.splitIntro}>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h2 id={titleId} className={styles.h2}>
              {title}
            </h2>
            <p className={styles.bodyLg}>{body}</p>
          </div>
          <CheckList items={bullets} className={styles.splitList} />
        </div>
        <div className={styles.splitVisual} data-reveal style={{ "--reveal-delay": "140ms" } as CSSProperties}>
          {visual}
        </div>
      </div>
    </section>
  );
}

export function Availability() {
  return (
    <SplitSection
      id="funktioner"
      eyebrow="Rådighed"
      title="Se, hvad du har til rådighed. Som banken ser det."
      body="Rådighedsbeløbet regnes, som banken gør, når I søger lån. Mad, opsparing og gaver holdes ude, så du kan se, om du ligger over eller under kravet."
      bullets={[
        "Nettoindtægt minus bankens faste udgifter, måned for måned",
        "Se hvornår et lån udløber og giver luft i budgettet",
        "Klik på en post for at rette den med det samme",
      ]}
      visual={<ShotFrame name="bank" alt="Rådighedsbeløb som banken regner det, med nettoindtægt, bankens faste udgifter, rådighedsbeløb og vejledende krav" width={1692} height={1352} />}
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
      visual={
        <div className={styles.sharePhotoWrap}>
          <div className={styles.sharePhoto}>
            <Image src="/landing/foto-flytning.jpg" alt="Et par, der flytter sammen, med flyttekasser" fill sizes="(max-width: 1019px) 100vw, 560px" className={styles.photoCover} />
          </div>
          <div className={styles.shareShot}>
            <ShotFrame name="hvem" alt="Hvem betaler hvad: to personkort med indtægter, udgifter og det, der er til rådighed hver måned" width={1808} height={1262} />
          </div>
        </div>
      }
      visualFirst
      tone="stone"
    />
  );
}

const NOTE_CARDS: readonly { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <TargetIcon size={20} strokeWidth={1.8} />,
    title: "Milepæle i opsparingen",
    body: "Ved 10, 25, 50, 75 og 100 % af målet får du en besked, næste gang du logger ind.",
  },
  {
    icon: <CalendarIcon size={20} strokeWidth={1.8} />,
    title: "Påmindelse om budgetgennemgang",
    body: "Hver måned, hver 3. måned, hvert halve år eller en gang om året, hvis budgettet ikke er rettet i perioden.",
  },
  {
    icon: <BellIcon size={20} strokeWidth={1.8} />,
    title: "I appen, på mail eller sms",
    body: "Påmindelsen vises, når du logger ind, og kan også sendes på mail eller sms.",
  },
];

/** Beskeder og påmindelser: the login note (goal milestone + review reminder) and the reminder settings. */
export function Notifications() {
  return (
    <section id="beskeder" className={`${styles.section} ${styles.notes}`} aria-labelledby="beskeder-title">
      {/* Text and a compact list on the left, the two screenshots on the right: one row on desktop. */}
      <div className={`${styles.sectionInner} ${styles.notesBody}`}>
        <div className={styles.notesText} data-reveal>
          <span className={styles.eyebrow}>Beskeder og påmindelser</span>
          <h2 id="beskeder-title" className={styles.h2}>
            Besked, når du når et mål. Påmindelse, når budgettet trænger.
          </h2>
          <p className={styles.bodyLg}>Du vælger selv, hvad du vil have besked om, og kan slå det fra igen.</p>
          <ul className={styles.notesCards}>
            {NOTE_CARDS.map((card) => (
              <li key={card.title} className={styles.notesCard}>
                <span className={styles.notesIcon} aria-hidden="true">
                  {card.icon}
                </span>
                <div>
                  <h3 className={styles.notesCardTitle}>{card.title}</h3>
                  <p className={styles.notesCardBody}>{card.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.notesVisual} data-reveal style={{ "--reveal-delay": "140ms" } as CSSProperties}>
          <figure className={`${styles.shotFrame} ${styles.notesSettings}`}>
            <ThemeShot
              name="paamind"
              alt="Indstillinger, Påmindelser: besked ved milepæle i opsparingen, påmindelse hver 3. måned og også på mail"
              width={1840}
              height={1260}
              sizes="(max-width: 760px) 100vw, 620px"
            />
          </figure>
          <figure className={`${styles.shotFrame} ${styles.notesNote}`}>
            <ThemeShot
              name="besked"
              alt="Beskeden ved login: Tillykke, Udbetaling til hus har nået 50 %, og det er tid til at se budgettet igennem"
              width={1040}
              height={928}
              sizes="(max-width: 760px) 90vw, 300px"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
