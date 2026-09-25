import type { ReactNode } from "react";
import styles from "./landing.module.css";
import { CheckIcon } from "./icons";

/*
 * Dark product cut-outs ("app windows") with fictional example data (HANDOFF §4, "Om eksempeltallene").
 * Each window is a labelled <figure>; its numbers stay readable for screen readers.
 * Compact layouts are driven by container queries on .product / .appWindow, so every window scales
 * with the column it sits in.
 */

type Tone = "default" | "light" | "pos";

function cx(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

function Stat({ label, value, sub, tone = "default", className }: { label: string; value: string; sub: string; tone?: Tone; className?: string }) {
  return (
    <div className={cx(styles.stat, tone === "light" && styles.statLight, tone === "pos" && styles.statPos, className)}>
      <span className={styles.statLabel}>{label}</span>
      <b className={styles.statValue}>{value}</b>
      <span className={styles.statSub}>{sub}</span>
    </div>
  );
}

type ValueTone = "default" | "pos" | "neg" | "blue" | "dim";

const VALUE_TONE: Record<ValueTone, string | undefined> = {
  default: undefined,
  pos: styles.valPos,
  neg: styles.valNeg,
  blue: styles.valBlue,
  dim: styles.valDim,
};

function Kv({ label, value, tone = "default", underline = false }: { label: string; value: string; tone?: ValueTone; underline?: boolean }) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{underline ? <u>{label}</u> : label}</span>
      <span className={cx(styles.kvValue, VALUE_TONE[tone])}>{value}</span>
    </div>
  );
}

function DeltaPill({ label, value, tone }: { label: string; value: string; tone: ValueTone }) {
  return (
    <span className={styles.deltaPill}>
      {label} <b className={VALUE_TONE[tone]}>{value}</b>
    </span>
  );
}

function Product({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <figure className={cx(styles.product, className)} aria-label={label}>
      {children}
    </figure>
  );
}

function ProductHead({ children }: { children: ReactNode }) {
  return <div className={styles.productHead}>{children}</div>;
}

/* ---------- Hero (desktop/tablet) ---------- */

const ACCOUNTS = [
  { name: "Budgetkonto", owner: "Fælles konto", status: "Dækket, overskud 150 kr" },
  { name: "Anna – lønkonto", owner: "Tilhører Anna", status: "Tilbage 6.420 kr" },
  { name: "Jonas – lønkonto", owner: "Tilhører Jonas", status: "Tilbage 4.530 kr" },
] as const;

export function HeroWindow() {
  return (
    <figure className={styles.appWindow} aria-label="Eksempel: budgettet for Anna og Jonas i budgetr">
      <div className={styles.titleBar} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.urlPill}>app.budgetr.dk</span>
      </div>
      <div className={styles.appTop}>
        <div className={styles.appTitle}>
          <b>Anna og Jonas’ budget</b>
          <span className={styles.muted11}>Gemt · delt med Jonas</span>
        </div>
        <span className={styles.muted11}>
          Indstillinger · Tema: Lyst / <b className={styles.strongLight}>Mørkt</b>
        </span>
      </div>
      <div className={styles.appTabsRow}>
        <div className={styles.appTabs}>
          <span className={cx(styles.appTab, styles.appTabActive)}>Budget</span>
          <span className={styles.appTab}>Overblik over lån</span>
          <span className={styles.appTab}>Faste overførsler</span>
          <span className={styles.appTab}>Opsparingsmål</span>
        </div>
        <div className={styles.appActions}>
          <span className={styles.chip}>Importér ▾</span>
          <span className={styles.chip}>Eksportér ▾</span>
          <span className={styles.chipPrimary}>+ Ny budgetpost</span>
        </div>
      </div>
      <div className={styles.appBody}>
        <div className={styles.segRow}>
          <span className={cx(styles.seg, styles.segActive)}>Nuværende</span>
          <span className={styles.seg}>Nyt hus fra 2027</span>
          <span className={styles.seg}>Nyt scenarie</span>
        </div>
        <p className={styles.summary}>
          Husstanden har <b>64.200 kr</b> i indtægter og <b>47.850 kr</b> i faste udgifter. Tilbage pr. måned:{" "}
          <b className={styles.valPos}>16.350 kr</b>. Efter opsparing på 5.400 kr er der{" "}
          <b className={styles.valPos}>10.950 kr</b> tilbage.
        </p>
        <p className={styles.note}>1 udgift er steget mindst 10 % det seneste år.</p>
        <div className={styles.heroStats}>
          <Stat label="Nettoindtægt" value="64.200 kr" sub="Løn og børnefamilieydelse" />
          <Stat label="Rådighedsbeløb" value="20.100 kr" sub="pr. måned" tone="light" />
          <Stat label="Luft over kravet" value="1.600 kr" sub="pr. måned" tone="pos" />
          <Stat label="Luft fra mar 2027" value="7.350 kr" sub="+5.750 kr frigives: Billån" tone="pos" />
        </div>
        <div className={styles.accountList}>
          {ACCOUNTS.map((account) => (
            <div key={account.name} className={styles.account}>
              <span className={styles.accountName}>
                <span className={styles.valDim} aria-hidden="true">
                  ›
                </span>
                <b>{account.name}</b>
                <span className={styles.accountOwner}>{account.owner}</span>
              </span>
              <span className={cx(styles.valPos, styles.num)}>{account.status}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

export function HeroFloatGoal() {
  return (
    <div className={styles.floatGoal}>
      <div className={styles.goalHead}>
        <b>
          <span className={cx(styles.swatch, styles.swPos)} />
          Udbetaling til hus
        </b>
        <span className={styles.muted11}>jun 2029</span>
      </div>
      <div className={cx(styles.goalAmount, styles.goalAmountLg)}>
        4.167 kr <span className={styles.per}>pr. md.</span>
      </div>
      <Progress percent={38} />
      <div className={styles.goalMeta}>95.000 af 250.000 kr · 38 %</div>
    </div>
  );
}

export function HeroFloatScenario() {
  return (
    <div className={styles.floatScenario}>
      <div className={styles.scenarioTitle}>
        <span className={styles.slateDot} />
        Nyt hus fra 2027 · holdt op mod nu
      </div>
      <div className={styles.pills}>
        <DeltaPill label="Faste udgifter" value="+6.200 kr" tone="neg" />
        <DeltaPill label="Rådighed" value="−2.400 kr" tone="neg" />
        <DeltaPill label="Opsparing" value="+1.500 kr" tone="default" />
      </div>
    </div>
  );
}

/* ---------- Hero (mobile, one person) ---------- */

export function HeroMobileCutout() {
  return (
    <Product label="Eksempel: et budget for én person i budgetr" className={styles.productCompact}>
      <div className={styles.segRow}>
        <span className={cx(styles.seg, styles.segActive)}>Nuværende</span>
        <span className={styles.seg}>Ny bolig 2027</span>
      </div>
      <p className={styles.summaryCompact}>
        Du har <b>34.800 kr</b> i indtægter og <b>24.300 kr</b> i faste udgifter. Tilbage pr. måned:{" "}
        <b className={styles.valPos}>10.500 kr</b>.
      </p>
      <div className={styles.statGrid2}>
        <Stat label="Rådighedsbeløb" value="10.500 kr" sub="pr. måned" tone="light" />
        <Stat label="Luft over kravet" value="2.300 kr" sub="pr. måned" tone="pos" />
      </div>
      <div className={cx(styles.goal, styles.goalCompact)}>
        <div className={styles.goalHead}>
          <b>
            <span className={cx(styles.swatch, styles.swPos)} />
            Udbetaling til lejlighed
          </b>
          <span className={styles.valDim}>jun 2029</span>
        </div>
        <div className={styles.goalAmount}>
          2.500 kr <span className={styles.per}>pr. md.</span>
        </div>
        <Progress percent={42} />
      </div>
    </Product>
  );
}

function Progress({ percent, tone = "pos" }: { percent: number; tone?: "pos" | "warn" }) {
  return (
    <div className={styles.progress} aria-hidden="true">
      {/* Width is data, so it stays an inline style. */}
      <div className={cx(styles.progressFill, tone === "warn" && styles.progressWarn)} style={{ width: `${percent}%` }} />
    </div>
  );
}

/* ---------- Rådighed ---------- */

export function AvailabilityCutout() {
  return (
    <Product label="Eksempel: rådighedsbeløb som banken regner det">
      <div className={styles.productTitleRow}>
        <b>Rådighedsbeløb som banken regner det</b>
        <span className={styles.muted11}>Tommelfingerregel for 2 voksne + 2 børn</span>
      </div>
      <div className={styles.statGrid3}>
        <Stat label="Nettoindtægt" value="64.200 kr" sub="uden ekstra indtjening" />
        <Stat label="Faste udgifter" value="44.100 kr" sub="6.900 kr er ikke medregnet" />
        <Stat label="Rådighedsbeløb" value="20.100 kr" sub="pr. måned" tone="light" />
        <Stat label="Vejledende krav" value="18.500 kr" sub="ikke bankens egne satser" />
        <Stat label="Luft over kravet" value="1.600 kr" sub="pr. måned" tone="pos" />
        <Stat label="Luft fra mar 2027" value="7.350 kr" sub="+5.750 kr frigives: Billån" tone="pos" />
      </div>
      <div className={styles.subHead}>Ikke medregnet som faste udgifter</div>
      <div className={styles.kvList}>
        <Kv label="Mad og husholdning" value="5.200 kr" underline />
        <Kv label="Opsparing: Sommerferie" value="1.500 kr" underline />
        <Kv label="Gaver" value="200 kr" underline />
      </div>
    </Product>
  );
}

/* ---------- Deler du økonomi? ---------- */

const PEOPLE = [
  { name: "Anna", income: "37.300 kr", own: "2.100 kr", shareLabel: "Andel af fælles udgifter (58 %)", share: "25.400 kr", transfer: "26.900 kr", available: "9.800 kr", saving: "3.380 kr", left: "6.420 kr" },
  { name: "Jonas", income: "26.900 kr", own: "1.850 kr", shareLabel: "Andel af fælles udgifter (42 %)", share: "18.400 kr", transfer: "19.500 kr", available: "6.550 kr", saving: "2.020 kr", left: "4.530 kr" },
] as const;

export function SharingCutout() {
  return (
    <Product label="Eksempel: hvem betaler hvad">
      <ProductHead>Hvem betaler hvad</ProductHead>
      <div className={styles.shareLegend}>
        <span>Fælles udgifter fordeles efter fast indkomst</span>
        <span className={styles.num}>Anna 58 % · Jonas 42 %</span>
      </div>
      <div className={styles.shareBar} aria-hidden="true">
        <div className={styles.barA} />
        <div className={styles.barB} />
      </div>
      <div className={styles.people}>
        {PEOPLE.map((person) => (
          <div key={person.name} className={styles.person}>
            <b className={styles.personName}>{person.name}</b>
            <div className={styles.personRows}>
              <Kv label="Faste indtægter" value={person.income} />
              <Kv label="Egne faste udgifter" value={person.own} />
              <Kv label={person.shareLabel} value={person.share} />
              <Kv label="Overføres til Budgetkonto" value={person.transfer} tone="blue" />
            </div>
            <div className={styles.personAmount}>{person.available}</div>
            <div className={styles.muted11}>til rådighed pr. måned</div>
            <div className={styles.divider} />
            <Kv label="Opsparing i alt" value={person.saving} />
            <Kv label="Tilbage efter opsparing" value={person.left} tone="pos" />
          </div>
        ))}
      </div>
    </Product>
  );
}

/* ---------- Lån ---------- */
