/**
 * budgetpro Skole – the pupil's 8-step flow "Hvad koster det at være voksen?": the three example people, the
 * choices per step, the month's numbers, the "Mit budget" posts and the pupil codes. No server imports: the browser
 * (components/skole/) and the server (lib/skole-store.ts) both use it. Design: docs/design/skole-skitse.html.
 */

// ---- Money -------------------------------------------------------------------------------------------------------

const digits = (n: number) => Math.abs(n).toLocaleString("da-DK");

/** "15.200 kr." / "−480 kr." (rounded to whole kroner, real minus sign). */
export function kr(n: number): string {
  const r = Math.round(n);
  return (r < 0 ? "−" : "") + digits(r) + " kr.";
}

/** "+2.473 kr." / "−3.700 kr." / "0 kr.". */
export function signedKr(n: number): string {
  const r = Math.round(n);
  return (r > 0 ? "+" : r < 0 ? "−" : "") + digits(r) + " kr.";
}

export const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
/** The first of the month `months` months after `now`. */
export const addMonths = (now: Date, months: number) => new Date(now.getFullYear(), now.getMonth() + months, 1);
/** "oktober 2027". */
export const monthYear = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
/** "8. oktober 2026". */
export const dayMonthYear = (d: Date) => `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

// ---- The people --------------------------------------------------------------------------------------------------

export type CaseId = "sara" | "jonas" | "mira";

export interface Case {
  id: CaseId;
  name: string;
  /** Genitive, for "Saras budget". */
  gen: string;
  age: number;
  job: string;
  gross: number;
  tax: number;
  net: number;
  dream: string;
  dreamAmt: number;
  /** Colours of the drawn face (components/skole/Avatar.tsx). */
  look: { bg: string; skin: string; hair: string; shirt: string };
}

export const CASES: Case[] = [
  { id: "sara", name: "Sara", gen: "Saras", age: 20, job: "Tømrerlærling", gross: 23000, tax: 7800, net: 15200, dream: "Kørekort", dreamAmt: 18000, look: { bg: "#FBF0D9", skin: "#E8B48A", hair: "#8A5F0F", shirt: "#1F5C4A" } },
  { id: "jonas", name: "Jonas", gen: "Jonas’", age: 22, job: "Social- og sundhedsassistent", gross: 30400, tax: 10600, net: 19800, dream: "Rejse til Japan", dreamAmt: 25000, look: { bg: "#E3EEE9", skin: "#C98B62", hair: "#16201D", shirt: "#86B8EE" } },
  { id: "mira", name: "Mira", gen: "Miras", age: 21, job: "Studerende på SU + fritidsjob", gross: 12000, tax: 2100, net: 9900, dream: "Ny computer", dreamAmt: 8000, look: { bg: "#E6EEF8", skin: "#F1C6A0", hair: "#A8412C", shirt: "#E4B758" } },
];

/** The chosen case, or Sara when none is chosen yet. */
export const caseById = (id: string | null | undefined): Case => CASES.find((c) => c.id === id) ?? CASES[0];

// ---- The steps ---------------------------------------------------------------------------------------------------

export const STEP_COUNT = 8;

export interface Step {
  short: string;
  q: string;
  /** The "Hvorfor?" box. */
  fact?: string;
  /** The reflection question, asked again on the summary. */
  refl?: string;
}

export function steps(c: Case): Step[] {
  return [
    { short: "Fremtidsperson", q: "Mød din fremtidsperson" },
    { short: "Indtægt", q: `Hvor mange penge får ${c.name} udbetalt?`, fact: "Man kan kun bruge de penge, der kommer ind på kontoen. Skat og AM-bidrag trækkes fra, før lønnen bliver udbetalt.", refl: "Hvor stor en del af lønnen gik til skat?" },
    { short: "Bolig", q: `Hvor skal ${c.name} bo?`, fact: "Boligen er som regel den største faste udgift og svær at ændre hurtigt. Derfor vælger man den først.", refl: "Hvad fik du for at betale mere?" },
    { short: "Faste udgifter", q: `Hvad betaler ${c.name} hver måned?`, fact: "Faste udgifter kommer uanset hvad. Dem skal man kende, før man ved, hvad der er tilbage.", refl: `Hvilke kunne ${c.name} undvære?` },
    { short: "Mad og hverdag", q: `Hvordan vil ${c.name} leve i hverdagen?`, fact: "Det, der er tilbage efter de faste udgifter, er rådighedsbeløbet. Det skal række til hverdagen, og det er det tal, banken kigger på.", refl: "Hvad er et behov, og hvad er et ønske?" },
    { short: "Opsparing", q: `Hvordan når ${c.name} sin drøm?`, fact: "Uforudsete udgifter kommer altid. Sparer man op først, når man sine mål, og en buffer betyder, at en uventet regning ikke bliver et lån.", refl: "Kan det gå hurtigere?" },
    { short: "Går det op?", q: `Har ${c.name} penge nok?`, fact: "Et budget, der ikke går op, bliver betalt med lån eller kreditkort, og det koster renter. Det er bedre at prioritere nu.", refl: "Hvad valgte du at ændre?" },
    { short: "Hvad nu hvis?", q: "Hvad sker der, hvis …?", fact: "Livet ændrer sig. Et budget er en plan, der skal kunne tilpasses, ikke et regnestykke, man laver én gang.", refl: "Hvilket scenarie rammer hårdest?" },
  ];
}

// ---- The choices -------------------------------------------------------------------------------------------------

export const BOLIG = [
  { amt: 3500, label: "Værelse", sub: "Lejer et værelse hos en anden" },
  { amt: 4800, label: "Delelejlighed", sub: "Deler en lejlighed med en ven" },
  { amt: 6900, label: "1-værelses", sub: "Egen lille lejlighed" },
] as const;

export type FasteKey = "forsikring" | "mobil" | "internet" | "transport" | "fag" | "stream";
export type IconName = "shield" | "phone" | "wifi" | "bus" | "people" | "play" | "food" | "shirt" | "house" | "chat";

export const FASTE: { key: FasteKey; label: string; amt: number; icon: IconName }[] = [
  { key: "forsikring", label: "Forsikring", amt: 150, icon: "shield" },
  { key: "mobil", label: "Mobil", amt: 129, icon: "phone" },
  { key: "internet", label: "Internet", amt: 199, icon: "wifi" },
  { key: "transport", label: "Transport", amt: 400, icon: "bus" },
  { key: "fag", label: "Fagforening og a-kasse", amt: 650, icon: "people" },
  { key: "stream", label: "Streaming", amt: 99, icon: "play" },
];

export const LEVELS = ["Stramt", "Normalt", "Rummeligt"] as const;
export const HVERDAG = [
  { key: "mad", title: "Mad", icon: "food", vals: [2000, 2800, 3800] },
  { key: "toj", title: "Tøj og fritid", icon: "shirt", vals: [800, 1500, 2500] },
] as const;

export const BUFFER_MAX = 1500;
export const MONTHS_MIN = 3;
export const MONTHS_MAX = 24;
/** Own fixed costs / own savings per pupil. */
export const MAX_OWN = 10;

export const JOBLESS_INCOME = 11500;
export const CAR_COST = 2100;
export type ScenKey = "rent" | "job" | "together" | "car";
export const SCEN_KEYS: ScenKey[] = ["rent", "job", "together", "car"];

/** Step 8's "what if" cards and what each does to the month (before the others are applied). */
export function scenarios(c: Case, bolig: number): { key: ScenKey; label: string; delta: number }[] {
  return [
    { key: "rent", label: "Huslejen stiger 10 %", delta: -Math.round(bolig * 0.1) },
    { key: "job", label: `${c.name} mister jobbet (indtægt 11.500 kr.)`, delta: JOBLESS_INCOME - c.net },
    { key: "together", label: "Flytter sammen (husleje halveres)", delta: Math.round(bolig / 2) },
    { key: "car", label: "Køber brugt bil på lån (2.100 kr./md.)", delta: -CAR_COST },
  ];
}

// ---- The pupil's state -------------------------------------------------------------------------------------------

export interface Own {
  name: string;
  amt: number;
}

export type Cat = "ind" | "bolig" | "faste" | "hverdag" | "ops";
export type Freq = "md" | "kv" | "aar";

export interface Post {
  id: string;
  cat: Cat;
  name: string;
  amt: number;
  freq: Freq;
}

/** Everything a pupil chose. Saved per code on the server; the reflection answers are not in here. */
export interface Flow {
  caseId: CaseId | null;
  /** The step on screen, 1–8. */
  step: number;
  /** The furthest step reached. */
  maxStep: number;
  /** Reached the summary. */
  done: boolean;
  bolig: number | null;
  faste: Record<FasteKey, boolean>;
  cFaste: Own[];
  mad: number | null;
  toj: number | null;
  buffer: number;
  months: number;
  cOps: Own[];
  scen: Partial<Record<ScenKey, boolean>>;
  /** "Mit budget"; null until the pupil opens it (then seeded from the choices). */
  posts: Post[] | null;
}

export function emptyFlow(): Flow {
  return {
    caseId: null,
    step: 1,
    maxStep: 1,
    done: false,
    bolig: null,
    faste: { forsikring: true, mobil: true, internet: true, transport: true, fag: true, stream: true },
    cFaste: [],
    mad: null,
    toj: null,
    buffer: 500,
    months: 12,
    cOps: [],
    scen: {},
    posts: null,
  };
}

// ---- The month ---------------------------------------------------------------------------------------------------

const sumOwn = (l: Own[]) => l.reduce((a, p) => a + p.amt, 0);

/** Monthly saving for the dream, rounded up to whole 50 kr. */
export const dreamMonthly = (c: Case, months: number) => Math.ceil(c.dreamAmt / months / 50) * 50;

export interface Totals {
  income: number;
  bolig: number;
  faste: number;
  /** Fixed costs without the car scenario (step 4's total). */
  fasteBase: number;
  hverdag: number;
  opsparing: number;
  spend: number;
  left: number;
  /** Left without any "Hvad nu hvis?" scenario. */
  leftBase: number;
}

export function totals(f: Flow): Totals {
  const c = caseById(f.caseId);
  const income = f.scen.job ? JOBLESS_INCOME : c.net;
  const boligBase = f.bolig ?? 0;
  const bolig = Math.round(boligBase * (f.scen.rent ? 1.1 : 1) * (f.scen.together ? 0.5 : 1));
  const fasteBase = FASTE.reduce((a, x) => a + (f.faste[x.key] ? x.amt : 0), 0) + sumOwn(f.cFaste);
  const faste = fasteBase + (f.scen.car ? CAR_COST : 0);
  const hverdag = (f.mad ?? 0) + (f.toj ?? 0);
  const opsparing = f.maxStep >= 6 ? f.buffer + dreamMonthly(c, f.months) + sumOwn(f.cOps) : 0;
  const spend = bolig + faste + hverdag + opsparing;
  return { income, bolig, faste, fasteBase, hverdag, opsparing, spend, left: income - spend, leftBase: c.net - boligBase - fasteBase - hverdag - opsparing };
}

/** The four parts of the donut, in the sketch's colours. */
export function segments(t: Totals): { label: string; amt: number; color: string }[] {
  return [
    { label: "Bolig", amt: t.bolig, color: "#1F5C4A" },
    { label: "Faste udgifter", amt: t.faste, color: "#2E7A62" },
    { label: "Hverdag", amt: t.hverdag, color: "#E4B758" },
    { label: "Opsparing", amt: t.opsparing, color: "#86B8EE" },
  ];
}

/** May the pupil go on from the current step? Step 2 waits until the pay slip has been shown (`revealed`). */
export function canNext(f: Flow, revealed: boolean): boolean {
  if (f.step === 1) return f.caseId != null;
  if (f.step === 2) return revealed;
  if (f.step === 3) return f.bolig != null;
  if (f.step === 5) return f.mad != null && f.toj != null;
  return true;
}

/** Does the budget add up? Known once step 7 ("Går det op?") is reached; the scenarios don't count. */
export function isOk(f: Flow): boolean | null {
  return f.maxStep >= 7 ? totals(f).leftBase >= 0 : null;
}
