import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Film } from "@/components/Film";
import styles from "./landing.module.css";
import { AppPair } from "./AppCard";
import { CheckList } from "./CheckList";
import { SwipeList } from "./Swipe";
import { ArrowRightIcon } from "./icons";

/** Right under the hero: the explainer film about budgetpro (components/Film.tsx). */
export function Explainer() {
  return (
    <section id="film" className={`${styles.section} ${styles.white}`} aria-labelledby="film-title">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHead} data-reveal>
          <div className={styles.sectionHeadTitle}>
            <span className={styles.eyebrow}>Hvad er budgetpro</span>
            <h2 id="film-title" className={styles.h2}>
              budgetpro på under et minut.
            </h2>
          </div>
          <p className={styles.headBody}>Se, hvordan budgettet bliver til, og hvad du får ud af det hver måned.</p>
        </div>
        <Film name="privat" label="Film: hvad du får med budgetpro" />
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Start din gratis prøveperiode",
    body: "Navn og e-mail er nok. Ingen adgangskode, du logger ind med en kode på mail. 30 dage gratis, og betalingskortet skal først bruges, når de er gået.",
  },
  {
    title: "Følg guiden i 9 trin",
    body: "Dig og dem, du deler økonomi med, konti, faste udgifter og opsparingsmål. Korte svar, som kan rettes bagefter.",
  },
  {
    title: "Importér en kontoudskrift",
    body: "Upload CSV, Excel eller PDF fra netbanken, og lav en budgetkladde ud fra den. Ydelser opdateres, og stigninger bliver markeret.",
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
              <span className={styles.stepNum} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
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
          <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>Investér 29 minutter</span>
          <h2 id="banner-title" className={styles.bannerTitle}>
            Ro i økonomien.
            <br />
            <span className={styles.thin}>Ro i livet.</span>
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
        <div className={styles.splitVisual} data-reveal="tilt" style={{ "--reveal-delay": "140ms" } as CSSProperties}>
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
      body="Rådighedsbeløbet regnes efter samme princip, som bankerne bruger, når I søger lån. Med opsparing og gaver holdt ude, så du kan se, om du ligger over eller under kravet."
      bullets={[
        "Nettoindtægt minus bankens faste udgifter, måned for måned",
        "Se hvornår et lån udløber og giver luft i budgettet",
        "Kan tilpasses din banks retningslinjer",
      ]}
      visual={<AppPair />}
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
          {/* Drawn with the demo family's numbers (Sofie 55 %, Mikkel 45 %), like the cards in the hero and Rådighed. */}
          <div className={styles.shareCard} aria-hidden="true">
            <span className={styles.shareCardLabel}>Hvem betaler hvad</span>
            <span className={styles.splitBar}>
              <span style={{ width: "55%" }}>Sofie 55 %</span>
              <span>Mikkel 45 %</span>
            </span>
            <span className={styles.shareCardNums}>
              <span>
                Sofie til rådighed
                <b>
                  10.105<small> kr</small>
                </b>
              </span>
              <span>
                Mikkel til rådighed
                <b>
                  5.818<small> kr</small>
                </b>
              </span>
            </span>
          </div>
        </div>
      }
      visualFirst
      tone="stone"
    />
  );
}

const BUSINESS = [
  { title: "Banker", body: "Kunder, der kommer til lånesamtalen med et budget." },
  { title: "Ejendomsmæglere", body: "Et budget, der følger med nøglerne til den nye bolig." },
  { title: "Skoler", body: "Privatøkonomi i udskolingen med budgetpro Skole." },
] as const;

/** A short teaser for budgetpro Erhverv (erhverv.<domain>, /erhverv), after Pris, on blæk with an umbra pill; it closes the page. */
export function BusinessTeaser() {
  return (
    <section className={styles.bizWrap} aria-labelledby="erhverv-title">
      <div className={styles.biz} data-reveal>
        <div className={styles.bizShapes} aria-hidden="true">
          <span />
          <span />
        </div>
        <div className={styles.bizText}>
          <span className={styles.pill}>Erhverv</span>
          <h2 id="erhverv-title" className={styles.bizTitle}>
            Giv budgetpro videre til jeres kunder.
          </h2>
          <p className={styles.bizBody}>
            Banker, ejendomsmæglere og skoler kan give deres kunder adgang med en e-mail. I ser aldrig kundens tal.
          </p>
          <a href="/erhverv" className={styles.bizLink}>
            Læs om budgetpro Erhverv <ArrowRightIcon size={14} />
          </a>
        </div>
        <ul className={styles.bizList}>
          {BUSINESS.map((b) => (
            <li key={b.title}>
              <b>{b.title}</b>
              <span>{b.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
