/**
 * budgetpro Skole's teaching material for the four lessons: the course description, a teacher's page per lesson and a
 * pupil's worksheet per lesson (printed with the pupil's code, components/skole/Material.tsx). The numbers and the
 * reflection questions come from lib/skole.ts, so they stay in step with the pupil's 8 steps. No server imports.
 */

import { BOLIG, CAR_COST, CASES, dreamMonthly, FASTE, JOBLESS_INCOME, kr, signedKr, steps, type Case } from "./skole";

export const LESSON_MINUTES = 45;

/** One task on a worksheet. Every kind but `text` leaves room for the pupil to write. */
export type Task =
  | { kind: "fields"; q: string; hint?: string; fields: { label: string; unit?: string }[] }
  | { kind: "choice"; q: string; hint?: string; options: string[]; lines?: number; follow?: string }
  | { kind: "lines"; q: string; hint?: string; lines: number }
  | { kind: "table"; q: string; hint?: string; cols: string[]; rows: string[] }
  | { kind: "sort"; q: string; hint?: string; cols: [string, string]; items: string[] };

export interface Lesson {
  n: number;
  /** "Trin 1–2". */
  steps: string;
  title: string;
  /** One line for the overview. */
  lead: string;
  terms: string[];
  goals: string[];
  prep: string[];
  /** The lesson minute by minute. */
  plan: { min: string; title: string; text: string }[];
  talk: string[];
  /** Numbers for the board: a small table per case. */
  key: { title: string; note?: string; cols: string[]; rows: string[][] };
  sheet: { intro: string; tasks: Task[] };
}

const pct = (a: number, b: number) => `${Math.round((a / b) * 1000) / 10} %`.replace(".", ",");
const refl = (step: number) => steps(CASES[0]!)[step - 1]!.refl!.replace(CASES[0]!.name, "din person");
const fasteAll = FASTE.reduce((a, f) => a + f.amt, 0);
const mid = BOLIG[1];
/** "Tømrerlærling" → "tømrerlærling", but "SU" stays. */
const job = (c: Case) => c.job[0]!.toLowerCase() + c.job.slice(1);
const caseRow = (c: Case) => `${c.name} (${job(c)})`;

export const LESSONS: Lesson[] = [
  {
    n: 1,
    steps: "Trin 1–2",
    title: "Mød din fremtidsperson",
    lead: "Eleven vælger en fremtidsperson og ser, hvordan løn før skat bliver til det beløb, der lander på kontoen.",
    terms: ["Løn før skat", "Skat", "AM-bidrag", "Udbetalt løn"],
    goals: [
      "Eleven kan forklare forskellen på løn før skat og udbetalt løn.",
      "Eleven kan regne ud, hvor stor en del af lønnen der går til skat og AM-bidrag, i procent.",
      "Eleven ved, at man kun kan bruge de penge, der faktisk kommer ind på kontoen.",
    ],
    prep: ["Print elevkoderne eller elevarket til lektion 1 med koderne på.", "Prøv selv de første to trin på elevsiden, så du kender lønsedlen."],
    plan: [
      { min: "0–10", title: "Fælles start", text: "Spørg klassen: Hvad tror I, en tømrerlærling får udbetalt om måneden? Skriv gættene på tavlen." },
      { min: "10–15", title: "Log ind", text: "Eleverne går ind på elevsiden og skriver deres kode. Ingen navne i programmet." },
      { min: "15–35", title: "Trin 1–2 og elevark", text: "Eleverne vælger en fremtidsperson, ser lønsedlen og løser opgaverne på elevarket." },
      { min: "35–45", title: "Opsamling", text: "Sammenlign gættene med de rigtige tal. Hvorfor betaler man skat, og hvad går den til?" },
    ],
    talk: ["Hvad betaler skatten til? Nævn tre ting, I selv bruger.", "Hvorfor betaler Mira mindre i skat end Jonas?", "Hvad overraskede jer mest ved lønsedlen?"],
    key: {
      title: "Lønsedlen",
      note: "Skat og AM-bidrag står samlet på lønsedlen. AM-bidrag er 8 % af lønnen før skat.",
      cols: ["Person", "Før skat", "Skat og AM", "Udbetalt", "Andel", "AM-bidrag"],
      rows: CASES.map((c) => [caseRow(c), kr(c.gross), kr(c.tax), kr(c.net), pct(c.tax, c.gross), kr(c.gross * 0.08)]),
    },
    sheet: {
      intro: "Vælg en fremtidsperson på trin 1, og se lønsedlen på trin 2. Skriv svarene her.",
      tasks: [
        { kind: "choice", q: "Hvem har du valgt?", options: CASES.map((c) => `${c.name}, ${c.age} år, ${job(c)}`), follow: "Hvorfor valgte du den person?", lines: 2 },
        { kind: "fields", q: "Hvad drømmer din person om?", fields: [{ label: "Drømmen" }, { label: "Den koster", unit: "kr." }] },
        { kind: "fields", q: "Lønsedlen", hint: "Skriv tallene fra trin 2.", fields: [{ label: "Løn før skat", unit: "kr." }, { label: "Skat og AM-bidrag", unit: "kr." }, { label: "Udbetalt", unit: "kr." }] },
        { kind: "fields", q: "Hvor stor en del af lønnen går til skat og AM-bidrag?", hint: "Regn: skat og AM-bidrag ÷ løn før skat × 100.", fields: [{ label: "Andel", unit: "%" }] },
        { kind: "fields", q: "AM-bidrag er 8 % af lønnen før skat. Hvor meget betaler din person i AM-bidrag?", fields: [{ label: "AM-bidrag", unit: "kr." }] },
        { kind: "lines", q: "Skatten betaler for ting, vi alle bruger. Nævn tre.", lines: 3 },
      ],
    },
  },
  {
    n: 2,
    steps: "Trin 3–5",
    title: "Bolig, faste udgifter og hverdag",
    lead: "Valg med konsekvenser. Budgetmåleren viser med det samme, hvad der er tilbage.",
    terms: ["Faste udgifter", "Rådighedsbeløb", "Behov og ønsker", "Boligandel"],
    goals: [
      "Eleven kan skelne mellem faste udgifter og udgifter, der kan ændres fra måned til måned.",
      "Eleven kan regne rådighedsbeløbet ud: udbetalt minus bolig og faste udgifter.",
      "Eleven kan skelne mellem et behov og et ønske og begrunde sine valg.",
    ],
    prep: ["Print elevarket til lektion 2.", "Eleverne fortsætter med samme kode. Deres valg er gemt fra sidst."],
    plan: [
      { min: "0–5", title: "Fælles start", text: "Hvad er den største udgift, en voksen har hver måned? Lad eleverne gætte." },
      { min: "5–30", title: "Trin 3–5 og elevark", text: "Eleverne vælger bolig, faste udgifter og hverdag og følger budgetmåleren. De udfylder elevarket undervejs." },
      { min: "30–38", title: "Behov eller ønske", text: "Eleverne sammenligner deres sortering to og to. Hvor er I uenige?" },
      { min: "38–45", title: "Opsamling", text: "Hvem valgte den dyreste bolig, og hvad fik de for pengene? Hvad valgte de fra?" },
    ],
    talk: ["Er en mobil et behov eller et ønske? Kommer det an på noget?", "Hvorfor vælger man bolig først?", "Hvad er rådighedsbeløbet, og hvorfor kigger banken på det?"],
    key: {
      title: "Boligandel og rådighedsbeløb",
      note: `Boligandel = husleje ÷ udbetalt løn. Rådighedsbeløb med ${mid.label.toLowerCase()} og alle faste udgifter (${kr(fasteAll)}) = udbetalt − ${kr(mid.amt)} − ${kr(fasteAll)}`,
      cols: ["Person", ...BOLIG.map((b) => `${b.label} (${kr(b.amt)})`), "Rådighed"],
      rows: CASES.map((c) => [caseRow(c), ...BOLIG.map((b) => pct(b.amt, c.net)), kr(c.net - mid.amt - fasteAll)]),
    },
    sheet: {
      intro: "Arbejd med trin 3, 4 og 5. Hold øje med budgetmåleren, mens du vælger.",
      tasks: [
        { kind: "choice", q: "Hvor skal din person bo?", options: BOLIG.map((b) => `${b.label}, ${kr(b.amt)}`), follow: refl(3), lines: 2 },
        {
          kind: "choice",
          q: "Faste udgifter. Sæt kryds ved dem, din person har.",
          options: FASTE.map((f) => `${f.label}, ${kr(f.amt)}`),
          follow: "Egne faste udgifter: ______________________   Faste udgifter i alt: ____________ kr.",
        },
        {
          kind: "fields",
          q: "Rådighedsbeløbet",
          hint: "Udbetalt − bolig − faste udgifter = rådighedsbeløb. Det er det, der skal række til hverdagen.",
          fields: [{ label: "Udbetalt", unit: "kr." }, { label: "Bolig", unit: "kr." }, { label: "Faste udgifter", unit: "kr." }, { label: "Rådighedsbeløb", unit: "kr." }],
        },
        {
          kind: "sort",
          q: "Behov eller ønske? Skriv hver ting i en af kolonnerne.",
          cols: ["Behov", "Ønske"],
          items: ["Husleje", "Mad", "Streaming", "Nyt tøj hver måned", "Mobil", "Takeaway", "Bus til arbejde", "Fitness", "Forsikring", "Koncertbillet"],
        },
        { kind: "fields", q: "Boligandel: Hvor stor en del af den udbetalte løn går til bolig?", hint: "Regn: bolig ÷ udbetalt × 100. Tommelfingerregel: højst 30 %.", fields: [{ label: "Boligandel", unit: "%" }] },
      ],
    },
  },
  {
    n: 3,
    steps: "Trin 6–7",
    title: "Opsparing og drømme",
    lead: "Buffer og et opsparingsmål med en dato. Går budgettet ikke op, skal eleven gå tilbage og prioritere.",
    terms: ["Buffer", "Opsparingsmål", "Prioritering", "Lån og renter"],
    goals: [
      "Eleven kan forklare, hvorfor man har en buffer til uforudsete udgifter.",
      "Eleven kan regne ud, hvor meget der skal spares op hver måned for at nå et mål til en bestemt dato.",
      "Eleven kan prioritere og ændre sine valg, når budgettet ikke går op.",
    ],
    prep: ["Print elevarket til lektion 3.", "Kig i klasseoverblikket, hvem der ikke er nået til trin 5. De kan starte med det."],
    plan: [
      { min: "0–5", title: "Fælles start", text: "Hvad gør man, hvis vaskemaskinen går i stykker, og der ikke er penge på kontoen?" },
      { min: "5–30", title: "Trin 6–7 og elevark", text: "Eleverne sætter buffer og opsparing og ser, om budgettet går op. Går det ikke, går de tilbage og ændrer." },
      { min: "30–45", title: "Opsamling", text: "Hvem måtte ændre noget, og hvad valgte de? Hvad koster det at låne i stedet for at spare op?" },
    ],
    talk: ["Hvorfor er det bedre at spare op end at låne til drømmen?", "Hvad kan man gøre, når budgettet ikke går op?", "Hvor stor skal en buffer være?"],
    key: {
      title: "Opsparing til drømmen",
      note: "budgetpro runder op til nærmeste 50 kr., så drømmen altid er betalt til tiden.",
      cols: ["Person", "Drøm", "Om 6 mdr.", "Om 12 mdr.", "Om 18 mdr."],
      rows: CASES.map((c) => [caseRow(c), `${c.dream}, ${kr(c.dreamAmt)}`, ...[6, 12, 18].map((m) => `${kr(dreamMonthly(c, m))}/md.`)]),
    },
    sheet: {
      intro: "Arbejd med trin 6 og 7. Går budgettet ikke op, så gå tilbage og ændr dine valg.",
      tasks: [
        {
          kind: "fields",
          q: "Bufferen",
          hint: "Cyklen skal repareres for 1.200 kr. Hvor mange måneder tager det at spare op til den med din buffer?",
          fields: [{ label: "Buffer pr. måned", unit: "kr." }, { label: "Antal måneder", unit: "mdr." }],
        },
        {
          kind: "fields",
          q: "Drømmen",
          hint: "Regn: pris ÷ antal måneder. budgetpro runder op til nærmeste 50 kr.",
          fields: [{ label: "Drømmen koster", unit: "kr." }, { label: "Klar om", unit: "mdr." }, { label: "Spar pr. måned", unit: "kr." }, { label: "Klar i (måned og år)" }],
        },
        { kind: "choice", q: "Går budgettet op?", options: ["Ja", "Nej"], follow: "Tilbage hver måned: ____________ kr." },
        { kind: "table", q: "Gik det ikke op? Skriv, hvad du ændrede.", cols: ["Før", "Efter"], rows: ["Bolig", "Faste udgifter", "Mad", "Tøj og fritid", "Opsparing"] },
        { kind: "lines", q: refl(6), lines: 3 },
      ],
    },
  },
  {
    n: 4,
    steps: "Trin 8 + Mit budget",
    title: "Hvad nu hvis …?",
    lead: "Huslejen stiger, jobbet forsvinder, man flytter sammen. Til sidst bygger eleven sit eget budget med poster og nøgletal.",
    terms: ["Scenarier", "Nøgletal", "Opsparingsrate", "Rådighed pr. dag"],
    goals: [
      "Eleven kan vurdere, hvordan en ændring i livet påvirker budgettet.",
      "Eleven kan læse og forklare nøgletal: boligandel, opsparingsrate og rådighed pr. dag.",
      "Eleven kan give råd om et budget og begrunde dem.",
    ],
    prep: ["Print elevarket til lektion 4.", "Fortæl eleverne, at opsummeringen gemmes som PDF og afleveres."],
    plan: [
      { min: "0–5", title: "Fælles start", text: "Hvad kan ske i livet, der ændrer økonomien? Lav en liste på tavlen." },
      { min: "5–20", title: "Trin 8 og elevark", text: "Eleverne slår scenarierne til et ad gangen og skriver, hvad der sker." },
      { min: "20–35", title: "Mit budget", text: "Eleverne åbner Mit budget, tilføjer egne poster og læser nøgletallene." },
      { min: "35–45", title: "Aflevering og opsamling", text: "Eleverne gemmer opsummeringen som PDF. Fælles: Hvilket scenarie ramte hårdest?" },
    ],
    talk: ["Hvilket scenarie ramte hårdest, og hvorfor?", "Hvad kan man gøre i dag for at klare sig, hvis jobbet forsvinder?", "Hvad betyder det at flytte sammen for økonomien?"],
    key: {
      title: "Scenarierne",
      note: `Med ${mid.label.toLowerCase()} (${kr(mid.amt)}). Ændringen pr. måned, før de andre scenarier.`,
      cols: ["Person", "Husleje +10 %", "Mister jobbet", "Flytter sammen", "Bil på lån"],
      rows: CASES.map((c) => [caseRow(c), signedKr(-mid.amt * 0.1), signedKr(JOBLESS_INCOME - c.net), signedKr(mid.amt / 2), signedKr(-CAR_COST)]),
    },
    sheet: {
      intro: "Arbejd med trin 8, og åbn derefter Mit budget. Til sidst gemmer du opsummeringen som PDF.",
      tasks: [
        {
          kind: "table",
          q: "Hvad nu hvis …? Slå et scenarie til ad gangen.",
          cols: ["Ændring pr. md.", "Tilbage pr. md."],
          rows: ["Huslejen stiger 10 %", `Mister jobbet (indtægt ${kr(JOBLESS_INCOME)})`, "Flytter sammen (husleje halveres)", `Køber brugt bil på lån (${kr(CAR_COST)}/md.)`],
        },
        { kind: "lines", q: `${refl(8)} Hvorfor?`, lines: 2 },
        {
          kind: "fields",
          q: "Nøgletal fra Mit budget",
          hint: "Tommelfingerregler: boligandel højst 30 %, opsparingsrate mindst 10 %.",
          fields: [
            { label: "Tilbage pr. måned", unit: "kr." },
            { label: "Rådighed pr. dag", unit: "kr." },
            { label: "Boligandel", unit: "%" },
            { label: "Opsparingsrate", unit: "%" },
            { label: "Drømmen klar om", unit: "mdr." },
          ],
        },
        { kind: "lines", q: "Giv tre gode råd til din fremtidsperson.", lines: 3 },
        { kind: "choice", q: "Aflevering", options: ["Jeg har gemt opsummeringen som PDF", "Jeg har afleveret den"] },
      ],
    },
  },
];

/** The whole course, for the course description. */
export const COURSE = {
  title: "Hvad koster det at være voksen?",
  sub: "Privatøkonomi på fire lektioner",
  audience: "7.–9. klasse",
  subjects: "Matematik og samfundsfag. Kan også bruges i et tema om uddannelse og job.",
  time: `4 lektioner à ${LESSON_MINUTES} minutter. Eleverne arbejder i eget tempo, så forløbet kan strækkes eller deles op.`,
  devices: "Chromebook, iPad, computer eller mobil. Eleverne logger ind med en elevkode, ikke med navn eller e-mail.",
  purpose:
    "Eleverne lægger et månedsbudget for en ung voksen: fra lønsedlen over bolig, faste udgifter og hverdag til opsparing og en drøm. Hvert valg har en konsekvens, som budgetmåleren viser med det samme. Til sidst ser de, hvad der sker, når livet ændrer sig, og bygger deres eget budget med nøgletal.",
  goals: [
    "forklare forskellen på løn før skat og udbetalt løn",
    "kende de faste udgifter og regne rådighedsbeløbet ud",
    "skelne mellem behov og ønsker og prioritere",
    "lægge et budget, der går op, med buffer og et opsparingsmål med en dato",
    "vurdere, hvordan ændringer i livet påvirker budgettet",
    "bruge procent og nøgletal som boligandel og opsparingsrate",
  ],
  people: CASES.map((c) => `${c.name}, ${c.age} år, ${job(c)}: ${kr(c.net)} udbetalt om måneden. Drømmen er ${c.dream[0]!.toLowerCase() + c.dream.slice(1)} til ${kr(c.dreamAmt)}`),
  before: [
    "Log ind som lærer, og opret klassen. Vælg klassetrin, antal elever og hvor længe koderne skal virke.",
    "Print elevkoderne, eller print elevarket til lektion 1 med koderne på. Skriv selv ned, hvem der har hvilken kode.",
    "Prøv gerne forløbet selv med en kode, eller se demoklassen.",
  ],
  during: [
    "Klasseoverblikket viser, hvor langt hver elev er, om budgettet går op, og hvilken person de har valgt.",
    "Klik på en elevkode for at se elevens valg og svar på refleksionsspørgsmålene.",
    "Eleverne fortsætter med samme kode i hver lektion. Deres valg er gemt.",
  ],
  evaluation: [
    "Opsummeringen med budget, mål og svar, som eleven gemmer som PDF og afleverer.",
    "Refleksionssvarene, som du kan læse i klasseoverblikket.",
    "Elevarkene og samtalen i klassen.",
  ],
  differentiation: [
    "Elever, der er hurtigt færdige, kan tilføje egne udgifter og opsparing, prøve en anden person med en ny kode eller bygge videre i Mit budget.",
    "Elever, der har brug for støtte, kan arbejde to og to. Jonas har den højeste løn og den mest rummelige økonomi. Mira har den laveste indtægt og skal prioritere mest.",
  ],
  privacy:
    "budgetpro gemmer ingen navne. Eleverne bruger en kode, og deres valg og svar slettes sammen med klassen, når koderne udløber efter 30, 60 eller 90 dage.",
  glossary: [
    { t: "Løn før skat", d: "Det, man tjener, før skat og AM-bidrag er trukket." },
    { t: "AM-bidrag", d: "Arbejdsmarkedsbidrag: 8 % af lønnen, som går til staten." },
    { t: "Udbetalt løn", d: "Det, der kommer ind på kontoen." },
    { t: "Faste udgifter", d: "Udgifter, der kommer hver måned uanset hvad, fx forsikring og mobil." },
    { t: "Rådighedsbeløb", d: "Det, der er tilbage efter bolig og faste udgifter. Det skal række til hverdagen." },
    { t: "Buffer", d: "Penge sat til side til uforudsete udgifter." },
    { t: "Boligandel", d: "Hvor stor en del af indtægten der går til bolig." },
    { t: "Opsparingsrate", d: "Hvor stor en del af indtægten der bliver sparet op." },
  ],
};
