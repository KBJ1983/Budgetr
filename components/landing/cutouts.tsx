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

const LOANS = [
  { n: 1, name: "Billån", end: "mar 2027", left: "6 md.", amount: "1.600 kr" },
  { n: 2, name: "Forbrugslån", end: "apr 2028", left: "1 år 7 md.", amount: "2.100 kr" },
  { n: 3, name: "Studielån", end: "jan 2030", left: "3 år 4 md.", amount: "1.850 kr" },
  { n: 4, name: "Pantebrev", end: "jul 2032", left: "5 år 10 md.", amount: "2.300 kr" },
] as const;

const GRID_LINES = [
  { y: 164.0, label: "0.0k" },
  { y: 133.1, label: "2.0k" },
  { y: 102.3, label: "3.9k" },
  { y: 71.4, label: "5.9k" },
  { y: 40.5, label: "7.9k" },
] as const;

const YEARS = [
  { x: 56.9, label: "2027" },
  { x: 124.4, label: "2028" },
  { x: 191.9, label: "2029" },
  { x: 259.4, label: "2030" },
  { x: 326.9, label: "2031" },
  { x: 394.4, label: "2032" },
  { x: 461.9, label: "2033" },
  { x: 529.4, label: "2034" },
] as const;

const STEPS = [
  { n: 1, x: 68.1, y: 138.8 },
  { n: 2, x: 141.2, y: 105.8 },
  { n: 3, x: 265.0, y: 76.7 },
  { n: 4, x: 433.8, y: 40.5 },
] as const;

function LoanChart() {
  return (
    <svg className={styles.chart} viewBox="0 0 596 190" role="img" aria-label="Frigivet ydelse over tid">
      {GRID_LINES.map((line) => (
        <g key={line.label}>
          <line x1="40" x2="580" y1={line.y} y2={line.y} stroke="#2C3633" />
          <text x="32" y={line.y + 4} textAnchor="end" fontSize="10" fill="#8E9A94">
            {line.label}
          </text>
        </g>
      ))}
      {YEARS.map((year) => (
        <text key={year.label} x={year.x} y="182" textAnchor="middle" fontSize="10" fill="#B3BEB9">
          {year.label}
        </text>
      ))}
      <path
        d="M40.0,164.0 L68.1,164.0 L68.1,138.8 L141.2,138.8 L141.2,105.8 L265.0,105.8 L265.0,76.7 L433.8,76.7 L433.8,40.5 L580.0,40.5"
        fill="none"
        stroke="#6CC2A2"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {STEPS.map((step) => (
        <g key={step.n}>
          <circle cx={step.x} cy={step.y} r="3.5" fill="#6CC2A2" />
          <circle cx={step.x} cy={step.y - 15} r="9" fill="#1A2220" stroke="#6CC2A2" strokeWidth="1.4" />
          <text x={step.x} y={step.y - 11} textAnchor="middle" fontSize="10" fontWeight="700" fill="#6CC2A2">
            {step.n}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function LoansCutout() {
  return (
    <Product label="Eksempel: udløb og frigivne beløb for lån">
      <ProductHead>Udløb og frigivne beløb</ProductHead>
      <div className={styles.loanStats}>
        <Stat label="Frigives inden for 12 md." value="1.600 kr" sub="Billån" tone="pos" />
        <Stat label="Næste udløb" value="Mar 2027" sub="Billån, 1.600 kr/md." className={styles.hideCompact} />
        <Stat label="Frigivet i alt" value="7.850 kr" sub="pr. md., når alle er betalt" tone="light" />
      </div>
      <LoanChart />
      <div className={styles.loanTable}>
        {LOANS.map((loan) => (
          <div key={loan.n} className={styles.loanRow}>
            <span className={styles.loanNum}>{loan.n}</span>
            <span>{loan.name}</span>
            <span className={styles.soft}>{loan.end}</span>
            <span className={cx(styles.valDim, styles.right, styles.loanDuration)}>{loan.left}</span>
            <b className={cx(styles.right, styles.num)}>{loan.amount}</b>
          </div>
        ))}
      </div>
    </Product>
  );
}

/* ---------- Alt det andet ---------- */

export function SavingsCutout() {
  return (
    <Product label="Eksempel: opsparingsmål">
      <ProductHead>Opsparingsmål</ProductHead>
      <div className={styles.goalList}>
        <div className={styles.goal}>
          <div className={styles.goalHead}>
            <b>
              <span className={cx(styles.swatch, styles.swPos)} />
              Udbetaling til hus
            </b>
            <span className={styles.tag}>Fast beløb</span>
          </div>
          <div className={styles.goalAmount}>
            4.167 kr <span className={styles.per}>pr. md.</span>
          </div>
          <Progress percent={38} />
          <div className={styles.goalMeta}>95.000 af 250.000 kr · 33 md. tilbage</div>
        </div>
        <div className={styles.goal}>
          <div className={styles.goalHead}>
            <b>
              <span className={cx(styles.swatch, styles.swWarn)} />
              Sommerferie 2027
            </b>
            <span className={styles.tag}>Fast beløb</span>
          </div>
          <div className={styles.goalAmount}>
            1.500 kr <span className={styles.per}>pr. md.</span>
          </div>
          <Progress percent={55} tone="warn" />
          <div className={styles.goalMeta}>Sænket fra 2.000 kr med feriepenge i maj</div>
        </div>
        <div className={styles.goal}>
          <div className={styles.goalHead}>
            <b>
              <span className={cx(styles.swatch, styles.swBlue)} />
              Buffer
            </b>
            <span className={styles.tag}>Pr. md.</span>
          </div>
          <div className={styles.goalAmount}>
            1.000 kr <span className={styles.per}>pr. md.</span>
          </div>
          <div className={styles.goalMetaFlat}>Løbende · om et år 12.000 kr</div>
        </div>
      </div>
    </Product>
  );
}

export function ScenarioCutout() {
  return (
    <Product label="Eksempel: scenarie holdt op mod nuværende budget">
      <ProductHead>Scenarier</ProductHead>
      <div className={styles.segRow}>
        <span className={styles.seg}>Nuværende</span>
        <span className={cx(styles.seg, styles.segSlate)}>Nyt hus fra 2027</span>
        <span className={styles.seg}>Barsel</span>
      </div>
      <div className={styles.scenarioBox}>
        <div className={styles.scenarioTitle}>● Holdt op mod nuværende budget · 7 ændringer</div>
        <div className={styles.pills}>
          <DeltaPill label="Indtægter" value="+2.000 kr" tone="pos" />
          <DeltaPill label="Faste udgifter" value="+6.200 kr" tone="neg" />
          <DeltaPill label="Tilbage efter opsparing" value="−3.100 kr" tone="neg" />
          <DeltaPill label="Rådighedsbeløb" value="−2.400 kr" tone="neg" />
        </div>
      </div>
      <div className={styles.kvBlock}>
        <Kv label="Boliglån – ny realkredit" value="+7.400 kr" tone="neg" />
        <Kv label="Husleje" value="−9.800 kr" tone="pos" />
        <Kv label="Varme og el" value="+1.600 kr" tone="neg" />
        <Kv label="Opsparing: Udbetaling til hus" value="fjernet" tone="dim" />
      </div>
    </Product>
  );
}

export function TransfersCutout() {
  return (
    <Product label="Eksempel: faste overførsler mellem konti">
      <ProductHead>Faste overførsler</ProductHead>
      <svg className={styles.chart} viewBox="0 0 356 170" role="img" aria-label="Faste overførsler mellem konti">
        <path d="M122,44 C178,44 178,46 234,46" fill="none" stroke="#6CC2A2" strokeOpacity="0.8" strokeWidth="12" />
        <path d="M122,114 C178,114 178,60 234,60" fill="none" stroke="#86B8EE" strokeOpacity="0.8" strokeWidth="9" />
        <path d="M122,124 C178,124 178,130 234,130" fill="none" stroke="#E4B758" strokeOpacity="0.8" strokeWidth="3.5" />
        <rect x="2" y="22" width="120" height="44" rx="8" fill="#1A2220" stroke="#2C3633" />
        <text x="12" y="41" fontSize="11" fontWeight="700" fill="#E7ECE9">
          Anna – løn
        </text>
        <rect x="2" y="92" width="120" height="44" rx="8" fill="#1A2220" stroke="#2C3633" />
        <text x="12" y="111" fontSize="11" fontWeight="700" fill="#E7ECE9">
          Jonas – løn
        </text>
        <text x="12" y="56" fontSize="10" fill="#B3BEB9">
          Ud 26.900 kr
        </text>
        <text x="12" y="126" fontSize="10" fill="#B3BEB9">
          Ud 23.667 kr
        </text>
        <rect x="234" y="30" width="120" height="44" rx="8" fill="#1A2220" stroke="#2C3633" />
        <text x="244" y="49" fontSize="11" fontWeight="700" fill="#E7ECE9">
          Budgetkonto
        </text>
        <rect x="234" y="108" width="120" height="44" rx="8" fill="#1A2220" stroke="#2C3633" />
        <text x="244" y="127" fontSize="11" fontWeight="700" fill="#E7ECE9">
          Fælles opsparing
        </text>
        <text x="244" y="64" fontSize="10" fill="#B3BEB9">
          Ind 46.400 kr
        </text>
        <text x="244" y="142" fontSize="10" fill="#B3BEB9">
          Ind 4.167 kr
        </text>
      </svg>
      <div className={styles.flowNote}>
        <b>Anna – løn → Budgetkonto</b>: 26.900 kr pr. måned · auto
      </div>
      <div className={styles.warnBox}>
        Skal rettes i netbanken: Jonas → Budgetkonto <b className={styles.num}>19.000 → 19.500 kr</b>
      </div>
    </Product>
  );
}

const IMPORT_ROWS = [
  { name: "El – Norlys", before: "2.263 kr", after: "2.455 kr", delta: "+192 kr", up: true },
  { name: "Realkredit", before: "8.927 kr", after: "9.313 kr", delta: "+386 kr", up: true },
  { name: "Fagforening", before: "721 kr", after: "744 kr", delta: "+23 kr", up: true },
  { name: "Mobil", before: "229 kr", after: "199 kr", delta: "−30 kr", up: false },
] as const;

export function ImportCutout() {
  return (
    <Product label="Eksempel: import af kontoudskrift">
      <ProductHead>Importér kontoudskrift</ProductHead>
      <div className={styles.importMeta}>412 posteringer · 4 budgetposter genkendt på aftalenummer</div>
      {IMPORT_ROWS.map((row) => (
        <div key={row.name} className={styles.importRow}>
          <span className={styles.importCheck}>
            <CheckIcon size={11} strokeWidth={3} />
          </span>
          <span>{row.name}</span>
          <span className={cx(styles.right, styles.valDim, styles.num)}>{row.before}</span>
          <b className={cx(styles.right, styles.num)}>{row.after}</b>
          <span className={cx(styles.right, styles.num, styles.importDelta, row.up ? styles.valNeg : styles.valPos)}>{row.delta}</span>
        </div>
      ))}
      <div className={styles.importFoot}>
        <span className={styles.chipPrimary}>Opdatér valgte</span>
      </div>
    </Product>
  );
}
