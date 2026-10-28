/**
 * budgetpro Skole – the pupil's 8-step flow "Hvad koster det at være voksen?": the three example people, the
 * choices per step, the month's numbers, the "Mit budget" posts and the pupil codes. No server imports: the browser
 * (components/skole/) and the server (lib/skole-store.ts) both use it. Design: docs/design/skole-skitse.html.
 */

import { isEmail, normalizeEmail } from "./signup";

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
  { id: "sara", name: "Sara", gen: "Saras", age: 20, job: "Tømrerlærling", gross: 23000, tax: 7800, net: 15200, dream: "Kørekort", dreamAmt: 18000, look: { bg: "#FCF1C8", skin: "#E8B48A", hair: "#7A5300", shirt: "#0E1B2C" } },
  { id: "jonas", name: "Jonas", gen: "Jonas’", age: 22, job: "Social- og sundhedsassistent", gross: 30400, tax: 10600, net: 19800, dream: "Rejse til Japan", dreamAmt: 25000, look: { bg: "#E8EBEF", skin: "#C98B62", hair: "#0E1B2C", shirt: "#F6CF4A" } },
  { id: "mira", name: "Mira", gen: "Miras", age: 21, job: "Studerende på SU + fritidsjob", gross: 12000, tax: 2100, net: 9900, dream: "Ny computer", dreamAmt: 8000, look: { bg: "#EFEDE6", skin: "#F1C6A0", hair: "#B4412C", shirt: "#5E7FA8" } },
];

/** The chosen case, or Sara when none is chosen yet. */
export const caseById = (id: string | null | undefined): Case => CASES.find((c) => c.id === id) ?? CASES[0]!;

// ---- The steps ---------------------------------------------------------------------------------------------------

export const STEP_COUNT = 8;

export interface Step {
  short: string;
  q: string;
  /** The "Hvorfor?" box. */
  fact?: string;
  /** The reflection question, asked again on the summary. */
  refl?: string;
  /** What a good answer to `refl` holds, so the pupil knows what to write. */
  help?: string;
}

export function steps(c: Case): Step[] {
  const n = c.name;
  return [
    { short: "Fremtidsperson", q: "Mød din fremtidsperson" },
    {
      short: "Indtægt",
      q: `Hvor mange penge får ${n} udbetalt?`,
      fact: "Man kan kun bruge de penge, der kommer ind på kontoen. Skat og AM-bidrag trækkes fra, før lønnen bliver udbetalt.",
      refl: "Hvor meget af lønnen gik til skat og AM-bidrag?",
      help: "Find tallene på lønsedlen. Skriv beløbet i kr. Regn derefter procenten ud: skat og AM-bidrag delt med løn før skat, gange 100. Eksempel: 2.500 kr. af 10.000 kr. er 25 %.",
    },
    {
      short: "Bolig",
      q: `Hvor skal ${n} bo?`,
      fact: "Boligen er som regel den største faste udgift og svær at ændre hurtigt. Derfor vælger man den først.",
      refl: `Hvorfor valgte du den bolig, og hvad koster valget?`,
      help: `Skriv, hvilken bolig du valgte, og hvad ${n} får ud af den, fx mere plads, ro eller at bo for sig selv. Skriv også, hvor mange kr. om måneden den koster mere end værelset (${kr(BOLIG[0].amt)}). Valgte du værelset, så skriv, hvad ${n} sparer, og hvad ${n} må undvære.`,
    },
    {
      short: "Faste udgifter",
      q: `Hvad betaler ${n} hver måned?`,
      fact: "Faste udgifter kommer uanset hvad. Dem skal man kende, før man ved, hvad der er tilbage.",
      refl: `Hvilke faste udgifter kunne ${n} undvære?`,
      help: `Kig på listen over faste udgifter. Vælg en eller flere udgifter, ${n} kunne klare sig uden, og skriv kort hvorfor. Læg beløbene sammen, og skriv, hvor mange kr. om måneden ${n} ville spare. Synes du, at alle er nødvendige, så forklar hvorfor.`,
    },
    {
      short: "Mad og hverdag",
      q: `Hvordan vil ${n} leve i hverdagen?`,
      fact: "Det, der er tilbage efter de faste udgifter, er rådighedsbeløbet. Det skal række til hverdagen, og det er det tal, banken kigger på.",
      refl: "Hvad er et behov, og hvad er et ønske?",
      help: `Et behov er noget, ${n} skal have for at klare hverdagen, fx mad. Et ønske er noget, der er rart, men ikke nødvendigt, fx takeaway eller en koncert. Skriv ét behov og ét ønske, og gæt på, hvor mange kr. ønsket koster om måneden.`,
    },
    {
      short: "Opsparing",
      q: `Hvordan når ${n} sin drøm?`,
      fact: "Uforudsete udgifter kommer altid. Sparer man op først, når man sine mål, og en buffer betyder, at en uventet regning ikke bliver et lån.",
      refl: `Hvordan kan ${n} nå sin drøm 3 måneder hurtigere?`,
      help: `Prøv det med skyderen: flyt den 3 måneder tættere på, og se, hvor meget ${n} så skal spare hver måned. Skriv, hvor mange kr. mere det er om måneden, og hvilken anden post i budgettet pengene kunne tages fra.`,
    },
    {
      short: "Går det op?",
      q: `Har ${n} penge nok?`,
      fact: "Et budget, der ikke går op, bliver betalt med lån eller kreditkort, og det koster renter. Det er bedre at prioritere nu.",
      refl: "Gik budgettet op, og hvad gjorde du?",
      help: `Gik det ikke op første gang, så skriv, hvad du ændrede, fx en billigere bolig eller en strammere hverdag, og hvor mange kr. om måneden det gav. Gik det op med det samme, så skriv, hvor mange kr. ${n} har tilbage hver måned, og hvad pengene kunne bruges til.`,
    },
    {
      short: "Hvad nu hvis?",
      q: "Hvad sker der, hvis …?",
      fact: "Livet ændrer sig. Et budget er en plan, der skal kunne tilpasses, ikke et regnestykke, man laver én gang.",
      refl: `Hvilket scenarie ville ramme ${n} hårdest?`,
      help: `Slå scenarierne til ét ad gangen, og se, hvor meget "Tilbage hver måned" ændrer sig. Skriv, hvilket der rammer hårdest, hvor mange kr. om måneden det ændrer, og hvad ${n} kunne gøre, hvis det skete.`,
    },
  ];
}

// ---- The choices -------------------------------------------------------------------------------------------------
// `info` is the text behind the small "i" next to each post (components/skole/Info.tsx).

/** The pay slip on step 2. */
export const PAY_INFO = {
  gross: "Det, man får på en måned, før der er trukket skat: løn og for studerende også SU. Det er tallet, der står i kontrakten eller på SU-oversigten.",
  tax: "Først trækkes AM-bidrag: 8 % af lønnen (ikke af SU). Af resten betaler man skat til kommunen og staten, men en del af indkomsten er skattefri, det hedder personfradraget. Skatten trækkes automatisk, før pengene bliver udbetalt.",
  net: "Det beløb, der lander på kontoen. Det er det, budgettet skal bygges på.",
};

export const BOLIG = [
  { amt: 3500, label: "Værelse", sub: "Lejer et værelse hos en anden", info: "Man lejer et værelse i en andens bolig og deler køkken og bad. Det er billigst, men man har mindre plads og privatliv. Ofte er varme og el med i lejen." },
  { amt: 4800, label: "Delelejlighed", sub: "Deler en lejlighed med en ven", info: "To deler en lejlighed og huslejen. Man har sit eget værelse og deler køkken, bad og stue. Det er en god idé at aftale, hvem der betaler hvad, og hvad der sker, hvis en flytter." },
  { amt: 6900, label: "1-værelses", sub: "Egen lille lejlighed", info: "En lille lejlighed for sig selv med eget køkken og bad. Mest frihed, men man betaler hele huslejen selv. Her er varme og el regnet med i huslejen. I virkeligheden betaler man det ofte for sig." },
] as const;

export type FasteKey = "forsikring" | "mobil" | "internet" | "transport" | "fag" | "stream";
export type IconName = "shield" | "phone" | "wifi" | "bus" | "people" | "play" | "food" | "shirt" | "house" | "chat";

export const FASTE: { key: FasteKey; label: string; amt: number; icon: IconName; info: string }[] = [
  { key: "forsikring", label: "Forsikring", amt: 150, icon: "shield", info: "En indboforsikring dækker ens ting ved fx brand, indbrud eller vandskade. Den har som regel også en ansvarsforsikring, hvis man kommer til at ødelægge noget for andre. Mange betaler én gang om året. Her er den regnet om til et beløb pr. måned." },
  { key: "mobil", label: "Mobil", amt: 129, icon: "phone", info: "Abonnement til opkald og data. Prisen afhænger mest af, hvor meget data man bruger. Selve telefonen er ikke med." },
  { key: "internet", label: "Internet", amt: 199, icon: "wifi", info: "Internet i boligen, fx til computer og tv. Bor man på værelse eller deler lejlighed, deler man ofte regningen, eller den er med i huslejen." },
  { key: "transport", label: "Transport", amt: 400, icon: "bus", info: "Bus eller tog til arbejde eller skole, fx et pendlerkort. Studerende kan ofte få et billigere ungdomskort. Har man bil, koster det meget mere." },
  { key: "fag", label: "Fagforening og a-kasse", amt: 650, icon: "people", info: "A-kassen udbetaler dagpenge, hvis man mister jobbet, men kun hvis man har været medlem et stykke tid. Fagforeningen hjælper med løn, kontrakt og problemer på arbejdspladsen. Begge dele giver fradrag i skatten." },
  { key: "stream", label: "Streaming", amt: 99, icon: "play", info: "Abonnementer på film, serier eller musik. Hvert enkelt er et lille beløb, men flere abonnementer løber hurtigt op. De er nemme at opsige igen." },
];

export const LEVELS = ["Stramt", "Normalt", "Rummeligt"] as const;
export const HVERDAG = [
  { key: "mad", title: "Mad", icon: "food", vals: [2000, 2800, 3800], info: "Alt, man spiser og drikker: indkøb, madpakker, kantine og takeaway. Stramt betyder, at man laver al maden selv og planlægger indkøbene. Rummeligt giver plads til takeaway og til at spise ude." },
  { key: "toj", title: "Tøj og fritid", icon: "shirt", vals: [800, 1500, 2500], info: "Tøj, sko, frisør, sport, biograf, at gå i byen og gaver. Stramt betyder få nye ting og billige fritidsinteresser. Rummeligt giver plads til mere af det hele." },
] as const;

/** Step 6. */
export const BUFFER_INFO = "Penge, der står klar til regninger, man ikke havde regnet med, fx en ødelagt telefon, en tandlægeregning eller en cykel, der skal repareres. Med en buffer behøver man ikke låne, når det sker.";
export const dreamInfo = (c: Case) => `Det beløb, ${c.name} skal spare op til drømmen. Jo længere tid der er til, jo mindre skal der spares hver måned. Er drømmen nået, kan pengene bruges på noget andet.`;

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
export function scenarios(c: Case, bolig: number): { key: ScenKey; label: string; delta: number; info: string }[] {
  return [
    { key: "rent", label: "Huslejen stiger 10 %", delta: -Math.round(bolig * 0.1), info: "Udlejeren kan sætte huslejen op, fx når priserne i samfundet stiger. Her stiger den 10 %, og resten af budgettet er det samme." },
    {
      key: "job",
      label: `${c.name} mister jobbet (indtægt 11.500 kr.)`,
      delta: JOBLESS_INCOME - c.net,
      info: `Er man medlem af en a-kasse, får man dagpenge, når man mister jobbet. Uden a-kasse kan man søge kontanthjælp hos kommunen. Her er indtægten sat til ${kr(JOBLESS_INCOME)} udbetalt om måneden.`,
    },
    { key: "together", label: "Flytter sammen (husleje halveres)", delta: Math.round(bolig / 2), info: "Flytter man sammen med en kæreste eller en ven, deler man huslejen. Her halveres den. Andre udgifter, fx internet, kan også deles, men det er ikke regnet med her." },
    { key: "car", label: "Køber brugt bil på lån (2.100 kr./md.)", delta: -CAR_COST, info: `Lånet til bilen koster ${kr(CAR_COST)} om måneden. En bil koster også brændstof, forsikring, grøn ejerafgift og service, som ikke er regnet med her.` },
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

/** The four parts of the donut ("Midnat og solgul"; on the midnight meter Bolig turns white, see onDark in Meter.tsx). */
export function segments(t: Totals): { label: string; amt: number; color: string }[] {
  return [
    { label: "Bolig", amt: t.bolig, color: "#0E1B2C" },
    { label: "Faste udgifter", amt: t.faste, color: "#5E7FA8" },
    { label: "Hverdag", amt: t.hverdag, color: "#F6CF4A" },
    { label: "Opsparing", amt: t.opsparing, color: "#D49A1A" },
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

// ---- Mit budget --------------------------------------------------------------------------------------------------

export const CATS: { key: Cat; label: string; color: string; info: string }[] = [
  { key: "ind", label: "Indtægt", color: "#9AA3AF", info: "Det, der kommer ind på kontoen efter skat: løn, SU eller andet." },
  { key: "bolig", label: "Bolig", color: "#0E1B2C", info: "Husleje og det, der ellers hører til boligen, fx el og varme, hvis det ikke er med i huslejen." },
  { key: "faste", label: "Faste udgifter", color: "#5E7FA8", info: "Udgifter, der kommer hver måned eller hvert år uanset hvad, fx forsikring, mobil, transport og abonnementer." },
  { key: "hverdag", label: "Hverdag", color: "#F6CF4A", info: "Det, man selv bestemmer fra måned til måned, fx mad, tøj og fritid." },
  { key: "ops", label: "Opsparing", color: "#D49A1A", info: "Penge, der bliver sat til side: buffer, drømme og andet, man sparer op til." },
];

export const FREQS: Record<Freq, { div: number; long: string; short: string }> = {
  md: { div: 1, long: "pr. md.", short: "md." },
  kv: { div: 3, long: "pr. kvartal", short: "kvt." },
  aar: { div: 12, long: "pr. år", short: "år" },
};
export const MAX_POSTS = 60;

export const monthly = (p: Post) => p.amt / FREQS[p.freq].div;

/** The pupil's choices as budget posts (what "Mit budget" starts from, and "Hent mine valg fra trinene igen"). */
export function seedPosts(f: Flow): Post[] {
  const c = caseById(f.caseId);
  let n = 0;
  const P = (cat: Cat, name: string, amt: number, freq: Freq = "md"): Post => ({ id: `s${n++}`, cat, name, amt, freq });
  const bolig = BOLIG.find((b) => b.amt === f.bolig) ?? BOLIG[1];
  return [
    P("ind", "Løn, udbetalt", c.net),
    P("bolig", "Husleje, " + bolig.label.toLowerCase(), bolig.amt),
    ...FASTE.filter((x) => f.faste[x.key]).map((x) => (x.key === "forsikring" ? P("faste", "Forsikring", 1800, "aar") : P("faste", x.label, x.amt))),
    P("hverdag", "Mad", f.mad ?? 2800),
    P("hverdag", "Tøj og fritid", f.toj ?? 1500),
    ...f.cFaste.map((p) => P("faste", p.name, p.amt)),
    P("ops", "Buffer", f.buffer),
    P("ops", c.dream, dreamMonthly(c, f.months)),
    ...f.cOps.map((p) => P("ops", p.name, p.amt)),
  ];
}

export interface BudgetNumbers {
  income: number;
  byCat: Record<Cat, number>;
  left: number;
  /** Income minus housing and fixed costs. */
  raad: number;
  boligPct: number;
  opsPct: number;
  /** Months until the dream, from the savings post named like the dream; null without one. */
  monthsToDream: number | null;
}

export function budgetNumbers(posts: Post[], c: Case): BudgetNumbers {
  const byCat: Record<Cat, number> = { ind: 0, bolig: 0, faste: 0, hverdag: 0, ops: 0 };
  for (const p of posts) byCat[p.cat] += monthly(p);
  const income = byCat.ind;
  const pct = (a: number) => (income > 0 ? Math.round((a / income) * 100) : 0);
  const dream = posts.find((p) => p.cat === "ops" && p.name === c.dream);
  const dm = dream ? monthly(dream) : 0;
  return {
    income,
    byCat,
    left: income - byCat.bolig - byCat.faste - byCat.hverdag - byCat.ops,
    raad: income - byCat.bolig - byCat.faste,
    boligPct: pct(byCat.bolig),
    opsPct: pct(byCat.ops),
    monthsToDream: dm > 0 ? Math.ceil(c.dreamAmt / dm) : null,
  };
}

/**
 * Page 2 of the Mit budget PDF (components/skole/pdf.ts): a talk with the parents about having a budget, with open
 * questions, and a word to the parents. Nothing of it is saved or handed in.
 */
export function parentTalk(c: Case) {
  return {
    title: "Snak med dine forældre om budgettet",
    intro: `Vis ${c.gen} budget til en voksen derhjemme, og snak om det at have et budget. Brug spørgsmålene her, og skriv et par stikord. I bestemmer selv, hvor meget I vil fortælle. Der er ingen rigtige svar.`,
    questions: [
      `Hvad overraskede dig mest, da du lavede budgettet for ${c.name}? Hvad tror din forælder, der overrasker de fleste, når de flytter hjemmefra?`,
      "Hvilke udgifter tror du er de største i jeres hjem? Spørg, om du har ret.",
      "Hvordan holder I styr på pengene derhjemme: i et budget, i en app, på papir eller i hovedet?",
      "Hvad gør I, når der kommer en regning, I ikke havde regnet med?",
      "Hvad var det første, din forælder sparede op til, og hvordan gik det?",
      "Hvad er et behov, og hvad er et ønske i jeres familie? Er I enige?",
      `Hvad ville din forælder ændre i budgettet for ${c.name}, og hvorfor?`,
      "Hvilket råd om penge vil din forælder give dig, når du selv flytter hjemmefra?",
    ],
    parentsTitle: "Til dig som forælder",
    parents: `Dit barn har lavet et månedsbudget for en ung voksen i budgetpro Skole: løn, bolig, faste udgifter, hverdag og opsparing. Vil I selv have et overblik over familiens økonomi, kan I prøve budgetpro gratis i 30 dage på budgetpro.dk. Du skal ikke oplyse betalingskort for at starte.`,
    footer: "Vil I lave et budget for hele familien? Prøv budgetpro gratis i 30 dage på budgetpro.dk.",
  };
}

/** 0 fine, 1 watch, 2 too high – housing should be at most 30 % of the income. */
export const boligLevel = (pct: number) => (pct <= 30 ? 0 : pct <= 40 ? 1 : 2);
/** 0 fine, 1 a bit low, 2 too low – save at least 10 % of the income. */
export const opsLevel = (pct: number) => (pct >= 10 ? 0 : pct >= 5 ? 1 : 2);

// ---- Pupil codes -------------------------------------------------------------------------------------------------

// 16 × 24 × 90 = 34,560 codes. Short Danish words, easy to read aloud and type on a Chromebook.
const COLORS = ["BLÅ", "GUL", "RØD", "GRØN", "LILLA", "SORT", "HVID", "BRUN", "GRÅ", "LYS", "MØRK", "GLAD", "VILD", "STOR", "LILLE", "SJOV"];
const ANIMALS = ["ORM", "RÆV", "UGLE", "ULV", "HARE", "SÆL", "MÅGE", "LAKS", "BJØRN", "ODDER", "MUS", "HJORT", "KAT", "HUND", "GED", "HEST", "ELG", "LØVE", "TIGER", "PANDA", "KRAGE", "SVANE", "ØRN", "FRØ"];
const CODE_RE = new RegExp(`^(?:${COLORS.join("|")})-(?:${ANIMALS.join("|")})-[1-9][0-9]$`);

// A word as a keyboard without æøå may type it: Å as AA or A, Ø as OE or O, Æ as AE, A or E.
const ALT: Record<string, string> = { Å: "(?:Å|AA|A)", Ø: "(?:Ø|OE|O)", Æ: "(?:Æ|AE|A|E)" };
const loose = (w: string) => [...w].map((ch) => ALT[ch] ?? ch).join("");
const LOOSE = (words: string[]) => words.map((w) => `(${loose(w)})`).join("|");
const LOOSE_RE = new RegExp(`^(?:${LOOSE(COLORS)})-?(?:${LOOSE(ANIMALS)})-?([1-9][0-9])$`);

/**
 * " blå orm 47 " → "BLÅ-ORM-47". Dashes and spaces may be left out, and æøå typed as aa/oe/ae or a/o/e:
 * "blaaorm47" and "gron-love-12" find their code too. Anything else is only cleaned up (and fails isCode).
 */
export function normalizeCode(s: string): string {
  const typed = s.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-{2,}/g, "-");
  const m = LOOSE_RE.exec(typed);
  if (!m) return typed;
  // One group per word: the first match in the colours, then in the animals, then the number.
  const groups = m.slice(1);
  const color = COLORS[groups.slice(0, COLORS.length).findIndex((g) => g !== undefined)];
  const animal = ANIMALS[groups.slice(COLORS.length, COLORS.length + ANIMALS.length).findIndex((g) => g !== undefined)];
  return `${color}-${animal}-${groups.at(-1)}`;
}
export const isCode = (s: string) => CODE_RE.test(s);

/** A random code; `rnd` returns a number in [0, 1). */
export function randomCode(rnd: () => number = Math.random): string {
  const at = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  return `${at(COLORS)}-${at(ANIMALS)}-${10 + Math.floor(rnd() * 90)}`;
}

// ---- Classes -----------------------------------------------------------------------------------------------------

/** Grades a class can be made for. */
export const TRIN: readonly number[] = [7, 8, 9];
export const MAX_PUPILS = 40;
/** How long a class lives, in days; the teacher picks one. Then the class, its codes and the pupils' work are deleted. */
export const LIFETIMES: readonly number[] = [30, 60, 90];
/** For classes made before the teacher could pick (and the default choice). */
export const DEFAULT_DAYS = 90;
/** "Prøv gratis med én klasse": the free class of a teacher without a seat (lib/skole-seats.ts) lives this long. */
export const TRIAL_DAYS = 30;
/** Longest reflection answer. */
export const MAX_ANSWER = 1000;

const isNum = (x: unknown, lo: number, hi: number): x is number => typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;
const isInt = (x: unknown, lo: number, hi: number): x is number => Number.isInteger(x) && isNum(x, lo, hi);
const text = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const pick = <T,>(x: unknown, allowed: readonly T[]): T | null => (allowed.includes(x as T) ? (x as T) : null);
const field = (o: unknown, k: string): unknown => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined);

function ownLines(x: unknown): Own[] {
  if (!Array.isArray(x)) return [];
  return x
    .map((o) => {
      const amt = field(o, "amt");
      return { name: text(field(o, "name"), 40), amt: isNum(amt, 0, 100000) ? Math.round(amt) : 0 };
    })
    .filter((o) => o.name)
    .slice(0, MAX_OWN);
}

function postLines(x: unknown): Post[] | null {
  if (!Array.isArray(x)) return null;
  return x.slice(0, MAX_POSTS).flatMap((p): Post[] => {
    const cat = pick(field(p, "cat"), CATS.map((c) => c.key));
    const freq = pick(field(p, "freq"), Object.keys(FREQS) as Freq[]);
    const id = text(field(p, "id"), 24);
    const amt = field(p, "amt");
    return cat && freq && id && isNum(amt, 0, 1_000_000) ? [{ id, cat, freq, name: text(field(p, "name"), 40), amt }] : [];
  });
}

/** A flow sent by the browser, checked: only known choices, short texts, bounded numbers. null if it isn't one. */
export function sanitizeFlow(x: unknown): Flow | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const step = o.step;
  const maxStep = o.maxStep;
  if (!isInt(step, 1, STEP_COUNT) || !isInt(maxStep, step, STEP_COUNT)) return null;
  const e = emptyFlow();
  const buffer = o.buffer;
  const months = o.months;
  return {
    caseId: pick(o.caseId, CASES.map((c) => c.id)),
    step,
    maxStep,
    done: o.done === true,
    bolig: pick(o.bolig, BOLIG.map((b) => b.amt)),
    faste: Object.fromEntries(FASTE.map((f) => [f.key, field(o.faste, f.key) === true])) as Record<FasteKey, boolean>,
    cFaste: ownLines(o.cFaste),
    mad: pick(o.mad, HVERDAG[0].vals),
    toj: pick(o.toj, HVERDAG[1].vals),
    buffer: isInt(buffer, 0, BUFFER_MAX) && buffer % 100 === 0 ? buffer : e.buffer,
    months: isInt(months, MONTHS_MIN, MONTHS_MAX) ? months : e.months,
    cOps: ownLines(o.cOps),
    scen: Object.fromEntries(SCEN_KEYS.filter((k) => field(o.scen, k) === true).map((k) => [k, true])),
    posts: postLines(o.posts),
  };
}

/** The reflection answers by step (2–8). Saved with the pupil's code, so the teacher can read them. */
export type Answers = Record<number, string>;

export function sanitizeAnswers(x: unknown): Answers {
  const out: Answers = {};
  for (let n = 2; n <= STEP_COUNT; n++) {
    const a = text(field(x, String(n)), MAX_ANSWER);
    if (a) out[n] = a;
  }
  return out;
}

/** One line of the teacher's table. */
export interface PupilRow {
  code: string;
  /** "Ikke startet", "Trin 5" or "Færdig". */
  status: string;
  ok: boolean | null;
  caseName: string | null;
  /** When the pupil last saved anything (ISO), for "sidst aktiv". */
  seen?: string;
}

export function pupilRow(code: string, f: Flow | null, seen?: string): PupilRow {
  const at = seen ? { seen } : {};
  if (!f) return { code, status: "Ikke startet", ok: null, caseName: null, ...at };
  return { code, status: f.done ? "Færdig" : `Trin ${f.maxStep}`, ok: isOk(f), caseName: f.caseId ? caseById(f.caseId).name : null, ...at };
}

/** "lige nu", "for 4 min. siden", "for 2 timer siden", "i går", "3. nov." – how long ago a pupil was active. */
export function seenAgo(iso: string, now = new Date()): string {
  const min = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
  if (min < 1) return "lige nu";
  if (min < 60) return `for ${min} min. siden`;
  const h = Math.floor(min / 60);
  if (h < 24) return `for ${h} ${h === 1 ? "time" : "timer"} siden`;
  if (h < 48) return "i går";
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", timeZone: "Europe/Copenhagen" });
}

export interface ClassStats {
  started: number;
  finished: number;
  /** Finished pupils whose budget adds up. */
  finishedOk: number;
  topCase: string | null;
  /** The most chosen home, and its share of the pupils who chose one. */
  topBolig: { label: string; pct: number; of: number } | null;
}

/** The most common value and its count; ties go to the one seen first. */
function mostCommon<T>(xs: T[]): [T, number] | null {
  const counts = new Map<T, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best: [T, number] | null = null;
  for (const e of counts) if (!best || e[1] > best[1]) best = e;
  return best;
}

export function classStats(flows: (Flow | null)[]): ClassStats {
  const started = flows.filter((f): f is Flow => !!f);
  const finished = started.filter((f) => f.done);
  const cases = started.map((f) => f.caseId).filter((c): c is CaseId => !!c);
  const homes = started.map((f) => f.bolig).filter((b): b is number => b != null);
  const topCase = mostCommon(cases);
  const topHome = mostCommon(homes);
  return {
    started: started.length,
    finished: finished.length,
    finishedOk: finished.filter((f) => isOk(f) === true).length,
    topCase: topCase ? caseById(topCase[0]).name : null,
    topBolig: topHome ? { label: BOLIG.find((b) => b.amt === topHome[0])?.label ?? "", pct: Math.round((topHome[1] / homes.length) * 100), of: homes.length } : null,
  };
}

/** One pupil as the teacher sees it: the choices in words and the reflection answers. */
export interface PupilDetail extends PupilRow {
  choices: { label: string; value: string }[];
  answers: { q: string; a: string }[];
}

export function pupilDetail(code: string, f: Flow | null, answers: Answers): PupilDetail {
  const row = pupilRow(code, f);
  if (!f) return { ...row, choices: [], answers: [] };
  const c = caseById(f.caseId);
  const t = totals(f);
  const choices: { label: string; value: string }[] = [];
  const add = (label: string, value: string) => choices.push({ label, value });
  const own = (l: Own[]) => l.map((o) => `${o.name} ${kr(o.amt)}`);
  const level = (vals: readonly number[], v: number) => `${LEVELS[vals.indexOf(v)] ?? ""}, ${kr(v)}`;

  if (f.caseId) add("Fremtidsperson", `${c.name}, ${c.age} år, ${c.job.toLowerCase()} – ${kr(c.net)} udbetalt`);
  const home = BOLIG.find((b) => b.amt === f.bolig);
  if (home) add("Bolig", `${home.label}, ${kr(home.amt)}`);
  if (f.maxStep >= 4) {
    const off = FASTE.filter((x) => !f.faste[x.key]).map((x) => x.label);
    const parts = [`${kr(t.fasteBase)} i alt`];
    if (off.length) parts.push(`fravalgt: ${off.join(", ")}`);
    if (f.cFaste.length) parts.push(`egne: ${own(f.cFaste).join(", ")}`);
    add("Faste udgifter", parts.join(" · "));
  }
  if (f.mad != null) add("Mad", level(HVERDAG[0].vals, f.mad));
  if (f.toj != null) add("Tøj og fritid", level(HVERDAG[1].vals, f.toj));
  if (f.maxStep >= 6) {
    add("Opsparing", [`Buffer ${kr(f.buffer)}`, `${c.dream} ${kr(dreamMonthly(c, f.months))} (klar om ${f.months} mdr.)`, ...own(f.cOps)].join(" · "));
  }
  if (f.maxStep >= 7) add("Tilbage pr. måned", signedKr(t.leftBase));
  if (f.maxStep >= 8) {
    const on = scenarios(c, f.bolig ?? 0).filter((x) => f.scen[x.key]).map((x) => x.label);
    add("Hvad nu hvis", on.length ? on.join(", ") : "Ingen slået til");
  }
  if (f.posts) add("Mit budget", `${f.posts.length} poster · tilbage ${signedKr(budgetNumbers(f.posts, c).left)} pr. måned`);
  return {
    ...row,
    choices,
    answers: steps(c)
      .slice(1)
      .map((st, i) => ({ q: st.refl ?? "", a: answers[i + 2] ?? "" })),
  };
}

// ---- Teachers ----------------------------------------------------------------------------------------------------

export interface TeacherInput {
  name: string;
  school: string;
  email: string;
}
export type TeacherField = keyof TeacherInput;

/** The teacher sign-up form, checked the same way in the browser and on the server. */
export function validateTeacher(x: unknown): { ok: true; value: TeacherInput } | { ok: false; errors: Partial<Record<TeacherField, string>> } {
  const name = text(field(x, "name"), 80);
  const school = text(field(x, "school"), 100);
  const email = normalizeEmail(field(x, "email"));
  const errors: Partial<Record<TeacherField, string>> = {};
  if (name.length < 2) errors.name = "Skriv dit navn.";
  if (school.length < 2) errors.school = "Skriv navnet på din skole.";
  if (!isEmail(email)) errors.email = "Skriv en gyldig e-mail, fx navn@skole.dk.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { name, school, email } };
}

/** One class on the teacher's front page. */
/** At most this many characters in a class's own name ("8.A", "Valghold 2"). */
export const MAX_CLASS_NAME = 24;
/** The name the teacher typed, cleaned up; "" for none. */
export const cleanClassName = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, MAX_CLASS_NAME) : "");
/** What a class is called on the teacher's pages and the code slips: its own name, or "8. klasse". */
export const classLabel = (c: { trin: number; name?: string }) => c.name || `${c.trin}. klasse`;

export interface ClassSummary {
  id: string;
  trin: number;
  /** The teacher's own name for the class, if any. */
  name?: string;
  created: string;
  expires: string;
  days: number;
  codes: string[];
  started: number;
  finished: number;
}

/** What the teacher's overview shows (lib/skole-store.ts builds it). */
export interface ClassView {
  id: string;
  trin: number;
  name?: string;
  codes: string[];
  created: string;
  /** When the codes stop working and everything is deleted. */
  expires: string;
  days: number;
  rows: PupilRow[];
  stats: ClassStats;
}
