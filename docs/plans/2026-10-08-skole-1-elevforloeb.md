# budgetpro Skole 1/3 – Pupil flow Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working pupil flow at `/skole`: code field, the 8 steps ("Hvad koster det at være voksen?"), the summary with reflection answers and PDF, and "Mit budget" with budget posts. Nothing is saved on the server yet (plan 2 adds that); reflection answers are kept in the browser.

**Architecture:** All numbers, texts and rules live in `lib/skole.ts` (pure TypeScript, no server imports, unit-tested). The UI is a set of React components in `components/skole/` styled by one CSS module; `app/skole/` holds the route and a layout that loads the school font. The design source is the click sketch `docs/design/skole-skitse.html` (an unpacked Claude Design bundle: the markup is in `<x-dc>`, the logic in the `class Component` script at the bottom). The sketch-only parts are left out: the screen jump bar, the Chromebook/Mobil switch, the scaled frame and the "Byg din egen – kommer senere" card.

**Tech Stack:** Next.js 16 (App Router, `"use client"` components), React 19, CSS modules, `next/font/google` (Schibsted Grotesk), Vitest, jsPDF + AutoTable from `public/budgetr-app/vendor/` (loaded on first use, not edited).

**Series:** 1/3 pupil flow (this) · 2/3 classes, codes and saving (`2026-10-08-skole-2-klasser.md`) · 3/3 subdomain, smoke test and docs (`2026-10-08-skole-3-subdomaene.md`).

---

## Ground rules (read first)

- Code and comments in English; all UI text in Danish, du-form, calm, no exclamation marks, no sales words (`docs/design/HANDOFF.md` §2). Copy the Danish strings in this plan exactly.
- Edit files with the Write/Edit tools only. Never read/write source with PowerShell `Get-Content`/`Set-Content` (it corrupts æøå).
- Dev server: `pnpm dev` (port 3200). Tests: `pnpm test`. Types: `pnpm typecheck`. Build: `pnpm build`.
- Commit as KBJ1983 (repo config is already set). End every commit message with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Use the minus sign `−` (U+2212) for negative amounts in the UI, like the sketch.

## File structure

| File | Responsibility |
|---|---|
| `lib/skole.ts` | Cases, step texts, choices, money formatting, month totals, "Mit budget" posts + key numbers, pupil-code format |
| `lib/skole.test.ts` | Unit tests for the above |
| `components/skole/skole.module.css` | All school styles (palette from the sketch, responsive at 760 px, print rules) |
| `components/skole/Shell.tsx` | Page frame: header (wordmark + "Skole" pill + right slot), footer, toast |
| `components/skole/useToast.ts` | Short-lived toast text |
| `components/skole/Icons.tsx` | Line icons, check mark, star |
| `components/skole/Avatar.tsx` | The drawn face of a case |
| `components/skole/Meter.tsx` | Donut + legend ("Tilbage") used in the flow and the summary |
| `components/skole/Start.tsx` | Start screen with the code field |
| `components/skole/Steps.tsx` | The body of each of the 8 steps |
| `components/skole/FlowView.tsx` | Progress dots, question, step body, "Hvorfor?" box, navigation, meter |
| `components/skole/Summary.tsx` | Summary with reflection answers and actions |
| `components/skole/pdf.ts` | Builds the summary PDF with jsPDF |
| `components/skole/MyBudget.tsx` | "Mit budget": edit posts, key numbers, bar |
| `components/skole/StudentApp.tsx` | Client state machine: start → flow → summary → budget |
| `app/skole/layout.tsx` | Loads Schibsted Grotesk as `--font-skole`, page title |
| `app/skole/page.tsx` | Renders `StudentApp` |

---

### Task 1: Month numbers in `lib/skole.ts`

**Files:**
- Create: `lib/skole.ts`
- Test: `lib/skole.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/skole.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canNext, caseById, dreamMonthly, emptyFlow, isOk, kr, scenarios, signedKr, steps, totals, type Flow } from "./skole";

/** Sara in a shared flat, all fixed costs, "Normalt" food and clothes. */
const sara = (patch: Partial<Flow> = {}): Flow => ({
  ...emptyFlow(),
  caseId: "sara",
  bolig: 4800,
  mad: 2800,
  toj: 1500,
  step: 6,
  maxStep: 6,
  ...patch,
});

describe("skole money", () => {
  it("formats kroner the Danish way with a real minus sign", () => {
    expect(kr(15200)).toBe("15.200 kr.");
    expect(kr(-480)).toBe("−480 kr.");
    expect(kr(-0.4)).toBe("0 kr.");
    expect(signedKr(2473)).toBe("+2.473 kr.");
    expect(signedKr(-3700)).toBe("−3.700 kr.");
    expect(signedKr(0)).toBe("0 kr.");
  });

  it("rounds the dream saving up to whole 50 kr.", () => {
    expect(dreamMonthly(caseById("sara"), 12)).toBe(1500);
    expect(dreamMonthly(caseById("mira"), 12)).toBe(700);
  });

  it("adds up the month", () => {
    expect(totals(sara())).toEqual({
      income: 15200,
      bolig: 4800,
      faste: 1627,
      fasteBase: 1627,
      hverdag: 4300,
      opsparing: 2000,
      spend: 12727,
      left: 2473,
      leftBase: 2473,
    });
  });

  it("counts savings only from step 6", () => {
    expect(totals(sara({ step: 5, maxStep: 5 })).left).toBe(4473);
  });

  it("applies the what-if scenarios, but not to leftBase", () => {
    const t = totals(sara({ scen: { rent: true, job: true } }));
    expect(t.income).toBe(11500);
    expect(t.bolig).toBe(5280);
    expect(t.left).toBe(-1707);
    expect(t.leftBase).toBe(2473);
    const u = totals(sara({ scen: { together: true, car: true } }));
    expect(u.bolig).toBe(2400);
    expect(u.faste).toBe(3727);
    expect(u.fasteBase).toBe(1627);
    expect(u.left).toBe(2773);
  });

  it("counts own fixed costs and own savings", () => {
    const t = totals(sara({ cFaste: [{ name: "Fitness", amt: 250 }], cOps: [{ name: "Ferie", amt: 300 }] }));
    expect(t.fasteBase).toBe(1877);
    expect(t.opsparing).toBe(2300);
    expect(t.left).toBe(1923);
  });

  it("lists the scenarios with their effect on the month", () => {
    expect(scenarios(caseById("sara"), 4800).map((s) => [s.key, s.delta])).toEqual([
      ["rent", -480],
      ["job", -3700],
      ["together", 2400],
      ["car", -2100],
    ]);
  });

  it("knows when the pupil may go on", () => {
    expect(canNext({ ...emptyFlow(), step: 1 }, false)).toBe(false);
    expect(canNext({ ...emptyFlow(), step: 1, caseId: "jonas" }, false)).toBe(true);
    expect(canNext(sara({ step: 2 }), false)).toBe(false);
    expect(canNext(sara({ step: 2 }), true)).toBe(true);
    expect(canNext(sara({ step: 3, bolig: null }), true)).toBe(false);
    expect(canNext(sara({ step: 5, toj: null }), true)).toBe(false);
    expect(canNext(sara({ step: 5 }), true)).toBe(true);
    expect(canNext(sara({ step: 8 }), true)).toBe(true);
  });

  it("says whether the budget adds up once step 7 is reached", () => {
    expect(isOk(sara())).toBeNull();
    expect(isOk(sara({ step: 7, maxStep: 7 }))).toBe(true);
    expect(isOk(sara({ step: 7, maxStep: 7, scen: { job: true, rent: true } }))).toBe(true);
    expect(isOk({ ...sara({ step: 7, maxStep: 7 }), caseId: "mira", bolig: 6900 })).toBe(false);
  });

  it("names the case in the step questions", () => {
    const s = steps(caseById("jonas"));
    expect(s).toHaveLength(8);
    expect(s[2].q).toBe("Hvor skal Jonas bo?");
    expect(s[0].fact).toBeUndefined();
    expect(s[7].refl).toBe("Hvilket scenarie rammer hårdest?");
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm test lib/skole.test.ts`
Expected: FAIL – `Failed to resolve import "./skole"`.

- [ ] **Step 3: Write `lib/skole.ts`**

```ts
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

/** Everything a pupil chose. Saved per code on the server (plan 2); the reflection answers are not in here. */
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
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm test lib/skole.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/skole.ts lib/skole.test.ts docs/design/skole-skitse.html
git commit -m "Skole: month numbers, cases and step texts for the pupil flow" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: "Mit budget" numbers and pupil codes in `lib/skole.ts`

**Files:**
- Modify: `lib/skole.ts` (append)
- Test: `lib/skole.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Add to the import line of `lib/skole.test.ts`: `boligLevel, budgetNumbers, isCode, monthly, normalizeCode, opsLevel, randomCode, seedPosts`. Then append:

```ts
describe("Mit budget", () => {
  it("seeds the posts from the choices, with insurance as a yearly post", () => {
    const posts = seedPosts(sara());
    expect(posts.find((p) => p.name === "Forsikring")).toMatchObject({ cat: "faste", amt: 1800, freq: "aar" });
    expect(posts.find((p) => p.cat === "bolig")?.name).toBe("Husleje, delelejlighed");
    expect(posts.filter((p) => p.cat === "ops").map((p) => [p.name, p.amt])).toEqual([["Buffer", 500], ["Kørekort", 1500]]);
    expect(new Set(posts.map((p) => p.id)).size).toBe(posts.length);
    expect(monthly({ id: "x", cat: "faste", name: "Forsikring", amt: 1800, freq: "aar" })).toBe(150);
    expect(monthly({ id: "x", cat: "faste", name: "Tandlæge", amt: 600, freq: "kv" })).toBe(200);
  });

  it("works out the key numbers", () => {
    const n = budgetNumbers(seedPosts(sara()), caseById("sara"));
    expect(n).toEqual({
      income: 15200,
      byCat: { ind: 15200, bolig: 4800, faste: 1627, hverdag: 4300, ops: 2000 },
      left: 2473,
      raad: 8773,
      boligPct: 32,
      opsPct: 13,
      monthsToDream: 12,
    });
    expect(budgetNumbers([], caseById("sara"))).toMatchObject({ income: 0, boligPct: 0, monthsToDream: null });
  });

  it("grades housing and savings by the rules of thumb", () => {
    expect([30, 31, 40, 41].map(boligLevel)).toEqual([0, 1, 1, 2]);
    expect([10, 9, 5, 4].map(opsLevel)).toEqual([0, 1, 1, 2]);
  });
});

describe("pupil codes", () => {
  it("reads a code however it is typed", () => {
    expect(normalizeCode(" blå orm 47 ")).toBe("BLÅ-ORM-47");
    expect(normalizeCode("gul--ræv-12")).toBe("GUL-RÆV-12");
  });

  it("knows the format COLOUR-ANIMAL-10..99", () => {
    expect(isCode("BLÅ-ORM-47")).toBe(true);
    expect(isCode("SJOV-FRØ-99")).toBe(true);
    expect(isCode("BLÅ-ORM-09")).toBe(false);
    expect(isCode("BLAA-ORM-47")).toBe(false);
    expect(isCode("BLÅ-ORM-47-1")).toBe(false);
  });

  it("makes codes in that format", () => {
    expect(randomCode(() => 0)).toBe("BLÅ-ORM-10");
    expect(randomCode(() => 0.999)).toBe("SJOV-FRØ-99");
    for (let i = 0; i < 200; i++) expect(isCode(randomCode())).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm test lib/skole.test.ts`
Expected: FAIL – `seedPosts is not a function` (and the other new names).

- [ ] **Step 3: Append to `lib/skole.ts`**

```ts
// ---- Mit budget --------------------------------------------------------------------------------------------------

export const CATS: { key: Cat; label: string; color: string }[] = [
  { key: "ind", label: "Indtægt", color: "#16201D" },
  { key: "bolig", label: "Bolig", color: "#1F5C4A" },
  { key: "faste", label: "Faste udgifter", color: "#2E7A62" },
  { key: "hverdag", label: "Hverdag", color: "#E4B758" },
  { key: "ops", label: "Opsparing", color: "#86B8EE" },
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

/** 0 fine, 1 watch, 2 too high – housing should be at most 30 % of the income. */
export const boligLevel = (pct: number) => (pct <= 30 ? 0 : pct <= 40 ? 1 : 2);
/** 0 fine, 1 a bit low, 2 too low – save at least 10 % of the income. */
export const opsLevel = (pct: number) => (pct >= 10 ? 0 : pct >= 5 ? 1 : 2);

// ---- Pupil codes -------------------------------------------------------------------------------------------------

// 16 × 24 × 90 = 34,560 codes. Short Danish words, easy to read aloud and type on a Chromebook.
const COLORS = ["BLÅ", "GUL", "RØD", "GRØN", "LILLA", "SORT", "HVID", "BRUN", "GRÅ", "LYS", "MØRK", "GLAD", "VILD", "STOR", "LILLE", "SJOV"];
const ANIMALS = ["ORM", "RÆV", "UGLE", "ULV", "HARE", "SÆL", "MÅGE", "LAKS", "BJØRN", "ODDER", "MUS", "HJORT", "KAT", "HUND", "GED", "HEST", "ELG", "LØVE", "TIGER", "PANDA", "KRAGE", "SVANE", "ØRN", "FRØ"];
const CODE_RE = new RegExp(`^(?:${COLORS.join("|")})-(?:${ANIMALS.join("|")})-[1-9][0-9]$`);

/** " blå orm 47 " → "BLÅ-ORM-47". */
export const normalizeCode = (s: string) => s.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-{2,}/g, "-");
export const isCode = (s: string) => CODE_RE.test(s);

/** A random code; `rnd` returns a number in [0, 1). */
export function randomCode(rnd: () => number = Math.random): string {
  const at = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  return `${at(COLORS)}-${at(ANIMALS)}-${10 + Math.floor(rnd() * 90)}`;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm test lib/skole.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/skole.ts lib/skole.test.ts
git commit -m "Skole: budget posts, key numbers and pupil codes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Styles and shared pieces

**Files:**
- Create: `components/skole/skole.module.css`, `components/skole/Shell.tsx`, `components/skole/useToast.ts`, `components/skole/Icons.tsx`, `components/skole/Avatar.tsx`, `components/skole/Meter.tsx`

- [ ] **Step 1: Create `components/skole/skole.module.css`**

Colours are the sketch's (`docs/design/skole-skitse.html`), which differ a little from the main site's palette on purpose (school look: bigger type, Schibsted Grotesk).

```css
/* budgetpro Skole. Palette and sizes from docs/design/skole-skitse.html. Phone layout below 760 px. */
.page {
  --ink: #16201d;
  --ink-2: #46534e;
  --mute: #7c8682;
  --rule: #dce0da;
  --rule-2: #ecede8;
  --paper: #f4f5f1;
  --pine: #1f5c4a;
  --pine-bg: #e3eee9;
  --pine-sel: #f1f7f4;
  --gold: #e4b758;
  --gold-bg: #fbf0d9;
  --gold-ink: #8a5f0f;
  --gold-ink-2: #5e410a;
  --gold-ink-3: #3d2b07;
  --red: #a8412c;
  --red-bg: #f6e4df;
  --blue: #86b8ee;
  --tick: #c9cec7;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-skole), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.page :where(input, button, textarea, select) { font-family: inherit; }
.page a { color: var(--pine); }
.page a:hover { color: var(--ink); }
.page input[type="range"] { accent-color: var(--pine); width: 100%; height: 28px; margin: 0; }

/* Frame */
.header { height: 60px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 40px; background: #fff; border-bottom: 1px solid var(--rule); }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.page .brand { color: var(--ink); }
.pill { font-weight: 600; font-size: 13px; line-height: 1; background: var(--gold); color: var(--ink); border-radius: 999px; padding: 6px 10px; }
.codeChip { display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 14px; color: var(--ink-2); white-space: nowrap; }
.codeChip b { font-weight: 600; color: var(--ink); background: var(--paper); border: 1px solid var(--rule); border-radius: 8px; padding: 5px 9px; letter-spacing: 0.04em; }
.teacherPill { font-weight: 600; font-size: 14px; color: var(--pine); background: var(--pine-bg); border-radius: 999px; padding: 6px 12px; }
.main { flex: 1; display: flex; flex-direction: column; }
.footer { height: 30px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; border-top: 1px solid var(--rule); background: #fff; font-size: 12px; color: var(--ink-2); }
.toast { position: fixed; bottom: 46px; left: 50%; transform: translateX(-50%); max-width: calc(100% - 32px); box-sizing: border-box; background: var(--ink); color: var(--paper); border-radius: 12px; padding: 12px 18px; font-weight: 500; font-size: 15px; z-index: 10; }

/* Buttons and fields */
.btn { height: 52px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; border-radius: 14px; padding: 0 24px; font-weight: 600; font-size: 17px; cursor: pointer; border: 1px solid var(--rule); background: #fff; text-decoration: none; }
.page .btn { color: var(--ink); }
.page .btnPrimary { border-color: var(--pine); background: var(--pine); color: #fff; }
.page .btnPrimary:disabled { background: var(--rule); border-color: var(--rule); color: var(--mute); cursor: not-allowed; }
.page .btnOutline { border: 2px solid var(--pine); color: var(--pine); }
.page .btnDanger { border-color: var(--red); background: var(--red); color: #fff; }
.btnSmall { height: 44px; border-radius: 12px; padding: 0 16px; font-size: 15px; }
.btn:focus-visible, .choice:focus-visible, .dotBtn:focus-visible, .factHead:focus-visible { outline: 3px solid var(--blue); outline-offset: 2px; }
.input { height: 46px; box-sizing: border-box; border: 1px solid var(--rule); border-radius: 12px; padding: 0 14px; font-weight: 500; font-size: 17px; color: var(--ink); background: #fff; outline-color: var(--pine); min-width: 0; }
.inputName { flex: 2 1 160px; }
.inputAmt { flex: 1 1 100px; font-weight: 600; }
.err { font-weight: 500; font-size: 15px; color: var(--red); }
.hint { font-size: 14px; color: var(--ink-2); }
.note { font-size: 17px; line-height: 1.5; color: var(--ink-2); }
.note b { color: var(--ink); }
.small { font-size: 15px; color: var(--ink-2); }
.label { font-weight: 600; font-size: 17px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.stack { display: flex; flex-direction: column; gap: 12px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }
.card { background: #fff; border: 1px solid var(--rule); border-radius: 16px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
.cardTitle { font-weight: 600; font-size: 18px; }
.h1 { margin: 0; font-weight: 700; font-size: 48px; line-height: 1.05; letter-spacing: -0.03em; text-wrap: balance; }
.h2 { margin: 0; font-weight: 700; font-size: 22px; letter-spacing: -0.01em; }
.q { margin: 0; font-weight: 700; font-size: 32px; line-height: 1.12; letter-spacing: -0.025em; text-wrap: balance; }
.lead { margin: 0; font-size: 18px; line-height: 1.5; color: var(--ink-2); }

/* Start */
.start { flex: 1; display: flex; align-items: center; justify-content: center; padding: 32px 24px; }
.startBox { width: 100%; max-width: 460px; display: flex; flex-direction: column; gap: 22px; }
.faces { display: flex; gap: 10px; }
.codeInput { height: 56px; box-sizing: border-box; border: 2px solid var(--rule); border-radius: 14px; padding: 0 18px; font-weight: 600; font-size: 22px; letter-spacing: 0.06em; background: #fff; color: var(--ink); outline: none; }
.codeInput:focus { border-color: var(--pine); }
.codeInput[aria-invalid="true"] { border-color: var(--red); }

/* Progress */
.progress { background: #fff; border-bottom: 1px solid var(--rule); padding: 14px 40px; display: flex; flex-direction: column; gap: 8px; }
.dots { display: flex; }
.dotBtn { all: unset; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; }
.dotBtn:not(:disabled) { cursor: pointer; }
.dotLine { position: absolute; top: 13px; right: 50%; width: 100%; height: 2px; background: var(--rule); }
.dotLine[data-on] { background: var(--pine); }
.dot { position: relative; width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--rule); background: #fff; color: var(--ink-2); box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; }
.dot[data-state="done"] { background: var(--pine-bg); border-color: var(--pine); color: var(--pine); }
.dot[data-state="cur"] { background: var(--pine); border-color: var(--pine); color: #fff; }
.dotLabel { font-weight: 500; font-size: 13px; color: var(--ink-2); white-space: nowrap; }
.dotLabel[data-cur] { font-weight: 700; color: var(--ink); }
.stepOf { display: none; font-weight: 600; font-size: 14px; color: var(--ink-2); text-align: center; }

/* Flow */
.flow { flex: 1; display: flex; flex-direction: column; }
.flowGrid { flex: 1; width: 100%; max-width: 1366px; margin: 0 auto; box-sizing: border-box; display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 40px; padding: 28px 40px; align-items: start; }
.flowGrid[data-wide] { grid-template-columns: minmax(0, 1fr); }
.col { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.kicker { font-weight: 600; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--pine); }
.nav { display: flex; justify-content: space-between; gap: 12px; padding-top: 4px; }

/* Choices: buttons with aria-pressed / aria-checked */
.choice { all: unset; box-sizing: border-box; cursor: pointer; background: #fff; border: 2px solid var(--rule); border-radius: 16px; position: relative; }
.choice[aria-pressed="true"], .choice[aria-checked="true"] { border-color: var(--pine); background: var(--pine-sel); }
.tick { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--tick); background: #fff; box-sizing: border-box; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tickSquare { border-radius: 8px; }
.choice[aria-checked="true"] .tick { border-color: var(--pine); background: var(--pine); }
.badge { position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 50%; background: var(--pine); display: flex; align-items: center; justify-content: center; }
.caseGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.caseCard { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.caseName { font-weight: 700; font-size: 22px; letter-spacing: -0.02em; }
.caseJob { font-size: 17px; line-height: 1.35; color: var(--ink-2); min-height: 46px; }
.caseNet { font-weight: 600; font-size: 17px; }
.caseNet span { font-weight: 400; color: var(--ink-2); }
.dream { font-weight: 500; font-size: 15px; line-height: 1.35; background: var(--gold-bg); color: var(--gold-ink); border-radius: 10px; padding: 8px 10px; }
.payRow { background: #fff; border: 1px solid var(--rule); border-radius: 16px; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; opacity: 0; transform: translateY(10px); transition: opacity 0.4s, transform 0.4s; }
.payRow[data-shown] { opacity: 1; transform: none; }
.payRow[data-kind="neg"] { color: var(--red); }
.payRow[data-kind="net"] { background: var(--pine); border-color: var(--pine); color: #fff; }
.payLabel { font-weight: 500; font-size: 19px; }
.payAmt { font-weight: 700; font-size: 28px; letter-spacing: -0.02em; white-space: nowrap; }
.boligOpt { min-height: 76px; padding: 14px 18px; display: flex; align-items: center; gap: 16px; }
.iconBox { width: 44px; height: 44px; border-radius: 12px; background: var(--pine-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.optText { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.optTitle { font-weight: 600; font-size: 19px; }
.optSub { font-size: 15px; color: var(--ink-2); }
.optAmt { font-weight: 700; font-size: 20px; white-space: nowrap; }
.twoCols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.threeCols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.fasteOpt { min-height: 60px; border-radius: 14px; padding: 10px 14px; display: flex; align-items: center; gap: 12px; }
.fasteLabel { flex: 1; font-weight: 500; font-size: 17px; line-height: 1.25; }
.fasteAmt { font-weight: 600; font-size: 17px; white-space: nowrap; color: #9aa39e; }
.choice[aria-checked="true"] .fasteAmt { color: var(--ink); }
.sumLine { display: flex; justify-content: space-between; gap: 12px; font-weight: 600; font-size: 19px; padding: 4px 4px 0; }
.ownRow { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-top: 1px solid var(--rule-2); }
.ownName { flex: 1; min-width: 0; font-weight: 500; font-size: 17px; overflow-wrap: anywhere; }
.ownAmt { font-weight: 600; font-size: 17px; white-space: nowrap; }
.del { width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 10px; background: var(--paper); cursor: pointer; color: var(--ink-2); font-size: 22px; line-height: 1; }
.addRow { display: flex; flex-wrap: wrap; gap: 8px; }
.groups { display: flex; flex-direction: column; gap: 18px; }
.groupHead { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 19px; }
.levelOpt { min-height: 72px; border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
.levelOpt .badge { top: 10px; right: 10px; width: 22px; height: 22px; }
.levelLabel { font-weight: 600; font-size: 17px; }
.levelAmt { font-weight: 700; font-size: 20px; letter-spacing: -0.01em; }
.sliderHead { display: flex; justify-content: space-between; gap: 12px; font-weight: 600; font-size: 19px; }
.sliderHead b { font-weight: 700; white-space: nowrap; }
.sliderSub { display: flex; justify-content: space-between; gap: 12px; font-size: 15px; color: var(--ink-2); }
.goalBox { background: var(--pine-bg); color: var(--pine); border-radius: 12px; padding: 12px 16px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; }
.goalBox b { font-size: 19px; }
.goalBox span { font-weight: 500; font-size: 15px; align-self: center; }
.result { --tone: var(--pine); background: #fff; border: 2px solid var(--tone); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.result[data-neg] { --tone: var(--red); }
.resultLabel { font-weight: 500; font-size: 17px; color: var(--ink-2); }
.resultAmt { font-weight: 700; font-size: 64px; line-height: 1; letter-spacing: -0.04em; color: var(--tone); }
.scenOpt { min-height: 92px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; }
.scenLabel { font-weight: 600; font-size: 17px; line-height: 1.3; }
.scenFoot { display: flex; justify-content: space-between; align-items: center; }
.delta { font-weight: 700; font-size: 19px; color: var(--pine); }
.delta[data-neg] { color: var(--red); }
.toggle { width: 40px; height: 24px; border-radius: 12px; background: var(--tick); position: relative; flex-shrink: 0; }
.toggle::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left 0.2s; }
.choice[aria-checked="true"] .toggle { background: var(--pine); }
.choice[aria-checked="true"] .toggle::after { left: 19px; }
.fact { background: var(--gold-bg); border-radius: 16px; padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; }
.factHead { all: unset; cursor: pointer; display: flex; align-items: center; gap: 10px; min-height: 28px; }
.factQ { width: 26px; height: 26px; border-radius: 50%; background: var(--gold-ink); color: #fff; font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; }
.factTitle { font-weight: 700; font-size: 17px; color: var(--gold-ink-2); }
.factToggle { margin-left: auto; font-weight: 600; font-size: 14px; color: var(--gold-ink); }
.factText { margin: 0; font-size: 17px; line-height: 1.5; color: var(--gold-ink-3); text-wrap: pretty; }
.refl { display: flex; align-items: center; gap: 10px; font-style: italic; font-size: 17px; color: var(--ink-2); }

/* Meter */
.meter { position: sticky; top: 16px; background: #fff; border: 1px solid var(--rule); border-radius: 16px; padding: 22px; display: flex; flex-direction: column; align-items: center; gap: 18px; }
.donut { position: relative; width: 220px; height: 220px; flex-shrink: 0; }
.donutBig { width: 240px; height: 240px; }
.donut svg { width: 100%; height: 100%; display: block; }
.donut circle { transition: stroke-dasharray 0.4s, stroke-dashoffset 0.4s; }
.donutMid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.donutLabel { font-weight: 500; font-size: 15px; color: var(--ink-2); }
.donutAmt { font-weight: 700; font-size: 30px; letter-spacing: -0.03em; white-space: nowrap; color: var(--pine); }
.donutAmt[data-neg] { color: var(--red); }
.legend { width: 100%; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.legendHead { display: flex; justify-content: space-between; gap: 12px; font-weight: 600; font-size: 17px; padding-bottom: 6px; border-bottom: 1px solid var(--rule-2); }
.legendRow { display: flex; align-items: center; gap: 10px; font-size: 16px; }
.swatch { width: 12px; height: 12px; border-radius: 4px; flex-shrink: 0; }
.legendName { flex: 1; color: var(--ink-2); }
.legendAmt { font-weight: 600; white-space: nowrap; }
.diff { margin-top: 4px; border-radius: 10px; padding: 8px 12px; font-weight: 600; font-size: 16px; display: flex; justify-content: space-between; background: var(--pine-bg); color: var(--pine); }
.diff[data-neg] { background: var(--red-bg); color: var(--red); }

/* Summary and Mit budget */
.wrap { width: 100%; max-width: 1120px; margin: 0 auto; padding: 28px 40px; box-sizing: border-box; display: flex; flex-direction: column; gap: 22px; }
.wrapWide { max-width: 1200px; }
.wrapNarrow { max-width: 960px; }
.titleBlock { display: flex; flex-direction: column; gap: 6px; }
.sub { font-weight: 500; font-size: 16px; color: var(--ink-2); }
.sub b { color: var(--ink); letter-spacing: 0.04em; }
.sumGrid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 18px; align-items: start; }
.sumCard { align-items: center; gap: 18px; padding: 22px; }
.star { width: 100%; box-sizing: border-box; background: var(--gold-bg); border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 17px; color: var(--gold-ink-2); }
.reflField { display: flex; flex-direction: column; gap: 6px; }
.reflQ { font-style: italic; font-size: 16px; color: var(--ink-2); }
.textarea { resize: vertical; border: 1px solid var(--rule); border-radius: 12px; padding: 10px 14px; font-size: 17px; line-height: 1.4; background: #fff; color: var(--ink); outline-color: var(--pine); }
.kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.kpi { gap: 6px; min-width: 0; }
.kpiL { font-weight: 500; font-size: 15px; color: var(--ink-2); }
.kpiV { font-weight: 700; font-size: 30px; line-height: 1.05; letter-spacing: -0.03em; white-space: nowrap; }
.kpiV[data-tone="pos"] { color: var(--pine); }
.kpiV[data-tone="neg"] { color: var(--red); }
.lvl { align-self: flex-start; font-weight: 600; font-size: 13px; border-radius: 999px; padding: 3px 10px; color: var(--pine); background: var(--pine-bg); }
.lvl[data-l="1"] { color: var(--gold-ink); background: var(--gold-bg); }
.lvl[data-l="2"] { color: var(--red); background: var(--red-bg); }
.kpiNote { font-size: 14px; line-height: 1.4; color: var(--ink-2); text-wrap: pretty; }
.bGrid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 18px; align-items: start; }
.side { position: sticky; top: 16px; display: flex; flex-direction: column; gap: 14px; }
.groupTitle { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; font-weight: 700; font-size: 17px; }
.groupTitle span:nth-child(2) { flex: 1; font-size: 18px; }
.postRow { display: grid; grid-template-columns: minmax(0, 1fr) 140px 40px; gap: 8px; align-items: center; padding: 6px 0; border-top: 1px solid var(--rule-2); }
.postMain { display: flex; flex-direction: column; min-width: 0; }
.postName { border: 0; background: transparent; font-weight: 500; font-size: 17px; color: var(--ink); padding: 6px 0; outline-color: var(--pine); min-width: 0; width: 100%; }
.postFreq { font-size: 13px; color: var(--ink-2); }
.amtBox { display: flex; align-items: center; border: 1px solid var(--rule); border-radius: 10px; padding: 0 10px; height: 42px; box-sizing: border-box; background: #fff; }
.amtBox input { width: 100%; min-width: 0; border: 0; outline: none; font-weight: 600; font-size: 17px; text-align: right; background: transparent; color: var(--ink); }
.amtBox span { font-size: 14px; color: var(--ink-2); margin-left: 4px; }
.newAmt { display: flex; gap: 8px; }
.newAmt .amtBox { flex: 1; height: 46px; }
.newAmt .amtBox input { text-align: left; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { height: 36px; border: 2px solid var(--rule); background: #fff; color: var(--ink); border-radius: 999px; padding: 0 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.chip[aria-pressed="true"] { border-color: var(--pine); background: var(--pine-sel); }
.chip .swatch { width: 9px; height: 9px; border-radius: 3px; }
.seg { display: flex; background: var(--paper); border-radius: 12px; padding: 3px; gap: 2px; }
.seg button { border: 0; background: transparent; color: var(--ink-2); border-radius: 9px; padding: 0 10px; font-weight: 600; font-size: 14px; cursor: pointer; }
.seg button[aria-pressed="true"] { background: #fff; color: var(--ink); }
.bar { display: flex; height: 20px; border-radius: 10px; overflow: hidden; background: var(--rule-2); }
.bar div { transition: width 0.3s; }

.printOnly { display: none; }

@media (prefers-reduced-motion: reduce) {
  .payRow, .donut circle, .toggle::after, .bar div { transition: none; }
}

@media (max-width: 760px) {
  .header { height: 56px; padding: 0 16px; }
  .footer { padding: 0 16px; }
  .codeLabel { display: none; }
  .h1 { font-size: 34px; }
  .q { font-size: 26px; }
  .start { padding: 24px 16px; }
  .progress { padding: 14px 16px 10px; }
  .dot { width: 12px; height: 12px; font-size: 0; }
  .dot svg { display: none; }
  .dotLine { top: 5px; }
  .dotLabel { display: none; }
  .stepOf { display: block; }
  .flowGrid { grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 16px; }
  .meter { order: -1; position: static; flex-direction: row; padding: 14px; gap: 14px; }
  .donut { width: 120px; height: 120px; }
  .donutBig { width: 200px; height: 200px; }
  .meter .donutLabel { font-size: 12px; }
  .meter .donutAmt { font-size: 16px; }
  .meter .legendRow { font-size: 14px; }
  .meter .legendHead { font-size: 15px; }
  .caseGrid, .twoCols, .threeCols, .sumGrid, .bGrid { grid-template-columns: minmax(0, 1fr); }
  .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kpiV { font-size: 24px; }
  .wrap { padding: 16px; }
  .side { position: static; }
  .postRow { grid-template-columns: minmax(0, 1fr) 110px 40px; }
  .resultAmt { font-size: 48px; }
  .payRow { padding: 14px 16px; }
  .payAmt { font-size: 22px; }
  .payLabel { font-size: 17px; }
}

@media print {
  .header, .footer, .noPrint { display: none !important; }
  .page { background: #fff; min-height: 0; }
  .printOnly { display: block; }
}
```

- [ ] **Step 2: Create `components/skole/useToast.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from "react";

/** A short message at the bottom of the page; shown for 2.6 seconds. */
export function useToast(): [string | null, (text: string) => void] {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useCallback((t: string) => {
    setText(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(null), 2600);
  }, []);
  return [text, show];
}
```

- [ ] **Step 3: Create `components/skole/Shell.tsx`**

```tsx
import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import s from "./skole.module.css";

/** The school page: header with the wordmark and the "Skole" pill, the content, and a quiet footer. */
export function Shell({ right, toast, children }: { right?: React.ReactNode; toast?: string | null; children: React.ReactNode }) {
  return (
    <div className={s.page}>
      <header className={s.header}>
        <Link href="/skole" className={s.brand}>
          <Wordmark fontSize={24} />
          <span className={s.pill}>Skole</span>
        </Link>
        {right}
      </header>
      <main className={s.main}>{children}</main>
      <footer className={s.footer}>
        <span>Eksempeltal</span>
        <span>Ingen navne gemmes</span>
      </footer>
      {toast && (
        <div className={s.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `components/skole/Icons.tsx`**

```tsx
import type { IconName } from "@/lib/skole";

const PATHS: Record<IconName, string> = {
  shield: "M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z",
  phone: "M8 3h8v18H8z M11 18h2",
  wifi: "M2 9a15 15 0 0 1 20 0 M5 13a10 10 0 0 1 14 0 M8.5 16.5a5 5 0 0 1 7 0 M12 20h.01",
  bus: "M5 4h14v13H5z M5 11h14 M8 20v-3 M16 20v-3",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3 3-5 6-5s6 2 6 5 M17 11a3 3 0 1 0 0-6 M21 20c0-3-2-5-4-5",
  play: "M4 5h16v14H4z M10 9l5 3-5 3z",
  food: "M4 11h16a8 8 0 0 1-16 0z M9 7c0-2 2-2 2-4 M14 7c0-2 2-2 2-4",
  shirt: "M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3c-1 2-2 3-4 3s-3-1-4-3z",
  house: "M4 11l8-7 8 7v9H4z M10 20v-5h4v5",
  chat: "M4 5h16v11H9l-5 4z",
};

export function Icon({ name, size = 22, color = "currentColor", width = 1.8 }: { name: IconName; size?: number; color?: string; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={PATHS[name]} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ size = 14, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M5 12l5 5 9-10" fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Star() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" fill="#E4B758" stroke="#8A5F0F" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 5: Create `components/skole/Avatar.tsx`**

```tsx
import type { Case } from "@/lib/skole";

/** The drawn face of a case (the sketch's round avatar). */
export function Avatar({ c, size }: { c: Case; size: number }) {
  const l = c.look;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" style={{ borderRadius: "50%", display: "block", flexShrink: 0 }}>
      <rect width="120" height="120" fill={l.bg} />
      <path d="M24 120c0-26 16-40 36-40s36 14 36 40z" fill={l.shirt} />
      <circle cx="60" cy="54" r="20" fill={l.skin} />
      <path d="M39 52c0-15 9-24 21-24s21 9 21 24c-6-7-13-10-21-10s-15 3-21 10z" fill={l.hair} />
    </svg>
  );
}
```

- [ ] **Step 6: Create `components/skole/Meter.tsx`**

```tsx
import { kr, segments, signedKr, type Totals } from "@/lib/skole";
import s from "./skole.module.css";

const R = 80;
const C = 2 * Math.PI * R;

/** The donut with "Tilbage" in the middle. Each part is its share of the income (or of the spending, if larger). */
export function Donut({ t, big = false }: { t: Totals; big?: boolean }) {
  const total = Math.max(t.income, t.spend);
  let cum = 0;
  const parts = segments(t).map((seg) => {
    const len = total ? (seg.amt / total) * C : 0;
    const part = { ...seg, len, off: -cum };
    cum += len;
    return part;
  });
  return (
    <div className={`${s.donut} ${big ? s.donutBig : ""}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={R} fill="none" stroke="#ECEDE8" strokeWidth="26" />
        {parts.map((p) => (
          <circle key={p.label} cx="100" cy="100" r={R} fill="none" stroke={p.color} strokeWidth="26" strokeDasharray={`${p.len} ${C}`} strokeDashoffset={p.off} transform="rotate(-90 100 100)" />
        ))}
      </svg>
      <div className={s.donutMid}>
        <span className={s.donutLabel}>Tilbage</span>
        <span className={s.donutAmt} data-neg={t.left < 0 || undefined}>
          {kr(t.left)}
        </span>
      </div>
    </div>
  );
}

export function Legend({ t }: { t: Totals }) {
  return (
    <div className={s.legend}>
      <div className={s.legendHead}>
        <span>Indtægt</span>
        <span>{kr(t.income)}</span>
      </div>
      {segments(t).map((seg) => (
        <div key={seg.label} className={s.legendRow}>
          <span className={s.swatch} style={{ background: seg.color }} />
          <span className={s.legendName}>{seg.label}</span>
          <span className={s.legendAmt}>{kr(seg.amt)}</span>
        </div>
      ))}
    </div>
  );
}

/** The flow's side panel. `diff` is shown on step 8 when a scenario is on (change against the plain budget). */
export function Meter({ t, diff }: { t: Totals; diff: number | null }) {
  return (
    <aside className={s.meter} aria-label="Månedens budget">
      <Donut t={t} />
      <div className={s.legend}>
        <Legend t={t} />
        {diff != null && (
          <div className={s.diff} data-neg={diff < 0 || undefined}>
            <span>Forskel</span>
            <span>{signedKr(diff)}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/skole
git commit -m "Skole: styles, page frame, icons, avatar and budget meter" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Start screen and the 8 steps

**Files:**
- Create: `components/skole/Start.tsx`, `components/skole/Steps.tsx`, `components/skole/FlowView.tsx`

- [ ] **Step 1: Create `components/skole/Start.tsx`**

```tsx
import Link from "next/link";
import { CASES } from "@/lib/skole";
import { Avatar } from "./Avatar";
import s from "./skole.module.css";

export function Start({ code, error, busy, onCode, onStart }: { code: string; error: string | null; busy: boolean; onCode: (v: string) => void; onStart: () => void }) {
  return (
    <div className={s.start}>
      <form
        className={s.startBox}
        onSubmit={(e) => {
          e.preventDefault();
          onStart();
        }}
      >
        <div className={s.faces}>
          {CASES.map((c) => (
            <Avatar key={c.id} c={c} size={64} />
          ))}
        </div>
        <h1 className={s.h1}>Hvad koster det at være voksen?</h1>
        <p className={s.lead}>Lav et månedsbudget for en fremtidsperson i 8 trin.</p>
        <div className={s.field}>
          <label className={s.label} htmlFor="elevkode">
            Din elevkode
          </label>
          <input
            id="elevkode"
            className={s.codeInput}
            value={code}
            onChange={(e) => onCode(e.target.value.toUpperCase())}
            placeholder="BLÅ-ORM-47"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            aria-invalid={!!error}
            aria-describedby="elevkode-hint"
          />
          {error && (
            <span className={s.err} role="alert">
              {error}
            </span>
          )}
          <span id="elevkode-hint" className={s.hint}>
            Format: ORD-ORD-00
          </span>
        </div>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy}>
          Start
        </button>
        <Link href="/skole/laerer" className={s.small}>
          Er du lærer? Opret en klasse.
        </Link>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/skole/Steps.tsx`**

```tsx
import { useState } from "react";
import {
  addMonths, BOLIG, BUFFER_MAX, CASES, caseById, dreamMonthly, FASTE, HVERDAG, kr, LEVELS, MAX_OWN, monthYear, MONTHS_MAX, MONTHS_MIN, scenarios, signedKr,
  type Case, type Flow, type Own, type Totals,
} from "@/lib/skole";
import { Avatar } from "./Avatar";
import { Check, Icon } from "./Icons";
import s from "./skole.module.css";
import type { Update } from "./StudentApp";

interface Props {
  flow: Flow;
  update: Update;
  go: (step: number) => void;
  reveal: number;
  t: Totals;
}

/** The body of the step on screen. */
export function StepBody({ flow, update, go, reveal, t }: Props) {
  const c = caseById(flow.caseId);
  switch (flow.step) {
    case 1:
      return <CasePick flow={flow} update={update} />;
    case 2:
      return <Pay c={c} reveal={reveal} />;
    case 3:
      return <Bolig flow={flow} update={update} />;
    case 4:
      return (
        <>
          <Faste flow={flow} update={update} t={t} />
          <OwnList title="Egne faste udgifter" placeholder="Fx Fitness" list={flow.cFaste} onChange={(cFaste) => update({ cFaste })} />
        </>
      );
    case 5:
      return <Hverdag flow={flow} update={update} />;
    case 6:
      return (
        <>
          <Savings c={c} flow={flow} update={update} />
          <OwnList title="Anden opsparing" placeholder="Fx Ferie, Gaver, Pension" list={flow.cOps} onChange={(cOps) => update({ cOps })} />
        </>
      );
    case 7:
      return <Result c={c} t={t} go={go} />;
    default:
      return <Scenarios c={c} flow={flow} update={update} />;
  }
}

function CasePick({ flow, update }: { flow: Flow; update: Update }) {
  return (
    <div className={s.caseGrid}>
      {CASES.map((x) => {
        const on = flow.caseId === x.id;
        return (
          <button key={x.id} type="button" className={`${s.choice} ${s.caseCard}`} aria-pressed={on} onClick={() => update({ caseId: x.id })}>
            {on && (
              <span className={s.badge}>
                <Check size={16} />
              </span>
            )}
            <Avatar c={x} size={84} />
            <span className={s.caseName}>
              {x.name}, {x.age}
            </span>
            <span className={s.caseJob}>{x.job}</span>
            <span className={s.caseNet}>
              {kr(x.net)} <span>udbetalt/md.</span>
            </span>
            <span className={s.dream}>
              Drøm: {x.dream}, {kr(x.dreamAmt)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Pay({ c, reveal }: { c: Case; reveal: number }) {
  const rows = [
    { label: "Løn før skat", amt: kr(c.gross), kind: undefined },
    { label: "Skat og AM-bidrag", amt: kr(-c.tax), kind: "neg" },
    { label: "Udbetalt", amt: kr(c.net), kind: "net" },
  ];
  return (
    <div className={s.stack} aria-live="polite">
      {rows.map((r, i) => (
        <div key={r.label} className={s.payRow} data-kind={r.kind} data-shown={reveal > i || undefined}>
          <span className={s.payLabel}>{r.label}</span>
          <span className={s.payAmt}>{r.amt}</span>
        </div>
      ))}
      {reveal >= 3 && (
        <span className={s.note}>
          <b>AM-bidrag</b> er 8 % af lønnen og går til staten. Skatten afhænger af, hvor meget man tjener.
        </span>
      )}
    </div>
  );
}

function Bolig({ flow, update }: { flow: Flow; update: Update }) {
  return (
    <div className={s.stack} role="radiogroup" aria-label="Bolig">
      {BOLIG.map((b) => {
        const on = flow.bolig === b.amt;
        return (
          <button key={b.amt} type="button" role="radio" aria-checked={on} className={`${s.choice} ${s.boligOpt}`} onClick={() => update({ bolig: b.amt })}>
            <span className={s.iconBox}>
              <Icon name="house" size={24} color="#1F5C4A" width={2} />
            </span>
            <span className={s.optText}>
              <span className={s.optTitle}>{b.label}</span>
              <span className={s.optSub}>{b.sub}</span>
            </span>
            <span className={s.optAmt}>{kr(b.amt)}</span>
            <span className={s.tick}>
              <Check />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Faste({ flow, update, t }: { flow: Flow; update: Update; t: Totals }) {
  return (
    <div className={s.stack}>
      <div className={s.twoCols}>
        {FASTE.map((f) => {
          const on = flow.faste[f.key];
          return (
            <button
              key={f.key}
              type="button"
              role="checkbox"
              aria-checked={on}
              className={`${s.choice} ${s.fasteOpt}`}
              onClick={() => update((x) => ({ faste: { ...x.faste, [f.key]: !x.faste[f.key] } }))}
            >
              <span className={`${s.tick} ${s.tickSquare}`}>
                <Check />
              </span>
              <Icon name={f.icon} color="#46534E" />
              <span className={s.fasteLabel}>{f.label}</span>
              <span className={s.fasteAmt}>{kr(f.amt)}</span>
            </button>
          );
        })}
      </div>
      <div className={s.sumLine}>
        <span>Faste udgifter i alt</span>
        <span>{kr(t.fasteBase)}/md.</span>
      </div>
    </div>
  );
}

/** "Egne faste udgifter" / "Anden opsparing": the pupil's own monthly lines. */
function OwnList({ title, placeholder, list, onChange }: { title: string; placeholder: string; list: Own[]; onChange: (l: Own[]) => void }) {
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");
  const ok = name.trim() !== "" && Number(amt) > 0;
  const add = () => {
    if (!ok) return;
    onChange([...list, { name: name.trim().slice(0, 40), amt: Math.min(Math.round(Number(amt)), 100000) }]);
    setName("");
    setAmt("");
  };
  return (
    <div className={s.card}>
      <span className={s.cardTitle}>{title}</span>
      {list.map((p, i) => (
        <div key={`${i}-${p.name}`} className={s.ownRow}>
          <span className={s.ownName}>{p.name}</span>
          <span className={s.ownAmt}>{kr(p.amt)}/md.</span>
          <button type="button" className={s.del} aria-label={`Slet ${p.name}`} onClick={() => onChange(list.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      {list.length < MAX_OWN && (
        <form
          className={s.addRow}
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input className={`${s.input} ${s.inputName}`} value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} aria-label={`${title}: navn`} maxLength={40} />
          <input className={`${s.input} ${s.inputAmt}`} type="number" inputMode="numeric" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="kr./md." aria-label={`${title}: beløb pr. måned`} />
          <button className={`${s.btn} ${s.btnPrimary} ${s.btnSmall}`} disabled={!ok}>
            Tilføj
          </button>
        </form>
      )}
    </div>
  );
}

function Hverdag({ flow, update }: { flow: Flow; update: Update }) {
  return (
    <div className={s.groups}>
      {HVERDAG.map((g) => (
        <div key={g.key} className={s.stack} role="radiogroup" aria-label={g.title}>
          <div className={s.groupHead}>
            <Icon name={g.icon} color="#1F5C4A" />
            <span>{g.title}</span>
          </div>
          <div className={s.threeCols}>
            {g.vals.map((v, i) => {
              const on = flow[g.key] === v;
              return (
                <button key={v} type="button" role="radio" aria-checked={on} className={`${s.choice} ${s.levelOpt}`} onClick={() => update(g.key === "mad" ? { mad: v } : { toj: v })}>
                  <span className={s.levelLabel}>{LEVELS[i]}</span>
                  <span className={s.levelAmt}>{kr(v)}</span>
                  {on && (
                    <span className={s.badge}>
                      <Check size={13} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Savings({ c, flow, update }: { c: Case; flow: Flow; update: Update }) {
  const dm = dreamMonthly(c, flow.months);
  const ready = monthYear(addMonths(new Date(), flow.months));
  return (
    <div className={s.stack}>
      <div className={s.card}>
        <label className={s.sliderHead} htmlFor="buffer">
          <span>Buffer til uforudsete udgifter</span>
          <b>{kr(flow.buffer)}/md.</b>
        </label>
        <input id="buffer" type="range" min={0} max={BUFFER_MAX} step={100} value={flow.buffer} onChange={(e) => update({ buffer: Number(e.target.value) })} />
      </div>
      <div className={s.card}>
        <div className={s.sliderHead}>
          <span>Mål: {c.dream}</span>
          <b>{kr(c.dreamAmt)}</b>
        </div>
        <label className={s.sliderSub} htmlFor="months">
          <span>Hvornår skal drømmen være klar?</span>
          <span>om {flow.months} mdr.</span>
        </label>
        <input id="months" type="range" min={MONTHS_MIN} max={MONTHS_MAX} step={1} value={flow.months} onChange={(e) => update({ months: Number(e.target.value) })} />
        <div className={s.goalBox}>
          <b>
            Spar {kr(dm)}/md. → klar om {flow.months} mdr.
          </b>
          <span>Klar i {ready}</span>
        </div>
      </div>
    </div>
  );
}

function Result({ c, t, go }: { c: Case; t: Totals; go: (step: number) => void }) {
  const neg = t.left < 0;
  return (
    <div className={s.result} data-neg={neg || undefined}>
      <span className={s.resultLabel}>Tilbage hver måned</span>
      <span className={s.resultAmt}>{signedKr(t.left)}</span>
      <span className={s.note}>
        {neg
          ? `${c.name} bruger flere penge, end der kommer ind. Gå tilbage og vælg en billigere bolig eller en strammere hverdag.`
          : `Budgettet går op. ${c.name} har penge tilbage, når alt er betalt og der er sparet op.`}
      </span>
      {neg && (
        <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => go(3)}>
          Gå tilbage og ændr
        </button>
      )}
    </div>
  );
}

function Scenarios({ c, flow, update }: { c: Case; flow: Flow; update: Update }) {
  return (
    <div className={s.stack} style={{ alignItems: "flex-start" }}>
      <div className={s.twoCols} style={{ width: "100%" }}>
        {scenarios(c, flow.bolig ?? 0).map((x) => {
          const on = !!flow.scen[x.key];
          return (
            <button
              key={x.key}
              type="button"
              role="switch"
              aria-checked={on}
              className={`${s.choice} ${s.scenOpt}`}
              onClick={() => update((f) => ({ scen: { ...f.scen, [x.key]: !f.scen[x.key] } }))}
            >
              <span className={s.scenLabel}>{x.label}</span>
              <span className={s.scenFoot}>
                <span className={s.delta} data-neg={x.delta < 0 || undefined}>
                  {signedKr(x.delta)}
                </span>
                <span className={s.toggle} />
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => update({ scen: {} })}>
        Nulstil
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/skole/FlowView.tsx`**

```tsx
import { useState } from "react";
import { canNext, caseById, STEP_COUNT, steps, totals, type Flow } from "@/lib/skole";
import { Check, Icon } from "./Icons";
import { Meter } from "./Meter";
import s from "./skole.module.css";
import { StepBody } from "./Steps";
import type { Update } from "./StudentApp";

interface Props {
  flow: Flow;
  update: Update;
  go: (step: number) => void;
  /** How many lines of step 2's pay slip are shown (0–3). */
  reveal: number;
  onBack: () => void;
  onFinish: () => void;
}

export function FlowView({ flow, update, go, reveal, onBack, onFinish }: Props) {
  const [closed, setClosed] = useState<Record<number, boolean>>({});
  const all = steps(caseById(flow.caseId));
  const cur = all[flow.step - 1];
  const t = totals(flow);
  const ok = canNext(flow, reveal >= 3);
  const last = flow.step === STEP_COUNT;
  const anyScen = Object.values(flow.scen).some(Boolean);
  const factOpen = !closed[flow.step];

  return (
    <div className={s.flow}>
      <nav className={s.progress} aria-label="Trin">
        <div className={s.dots}>
          {all.map((st, i) => {
            const n = i + 1;
            const isCur = n === flow.step;
            const done = n < flow.step && n <= flow.maxStep;
            return (
              <button
                key={n}
                type="button"
                className={s.dotBtn}
                disabled={n > flow.maxStep}
                aria-current={isCur ? "step" : undefined}
                aria-label={`Trin ${n}: ${st.short}`}
                onClick={() => go(n)}
              >
                {n > 1 && <span className={s.dotLine} data-on={n <= flow.maxStep || undefined} />}
                <span className={s.dot} data-state={isCur ? "cur" : done ? "done" : undefined}>
                  {done ? <Check size={14} color="#1F5C4A" /> : n}
                </span>
                <span className={s.dotLabel} data-cur={isCur || undefined}>
                  {st.short}
                </span>
              </button>
            );
          })}
        </div>
        <span className={s.stepOf}>
          Trin {flow.step} af {STEP_COUNT} · {cur.short}
        </span>
      </nav>

      <div className={s.flowGrid} data-wide={flow.step === 1 || undefined}>
        <div className={s.col}>
          <div className={s.titleBlock}>
            <span className={s.kicker}>
              Trin {flow.step} · {cur.short}
            </span>
            <h1 className={s.q}>{cur.q}</h1>
          </div>

          <StepBody flow={flow} update={update} go={go} reveal={reveal} t={t} />

          {cur.fact && (
            <>
              <div className={s.fact}>
                <button type="button" className={s.factHead} aria-expanded={factOpen} onClick={() => setClosed((c) => ({ ...c, [flow.step]: factOpen }))}>
                  <span className={s.factQ}>?</span>
                  <span className={s.factTitle}>Hvorfor?</span>
                  <span className={s.factToggle}>{factOpen ? "Skjul" : "Vis"}</span>
                </button>
                {factOpen && <p className={s.factText}>{cur.fact}</p>}
              </div>
              <div className={s.refl}>
                <Icon name="chat" color="#46534E" />
                <span>{cur.refl}</span>
              </div>
            </>
          )}

          <div className={s.nav}>
            <button type="button" className={s.btn} onClick={onBack}>
              Tilbage
            </button>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={!ok} onClick={() => (last ? onFinish() : go(flow.step + 1))}>
              {last ? "Se opsummering" : "Næste"}
            </button>
          </div>
        </div>

        {flow.step > 1 && <Meter t={t} diff={last && anyScen ? t.left - t.leftBase : null} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: errors only about the missing module `./StudentApp` (it comes in Task 6). Anything else must be fixed now.

(No commit yet – the next tasks complete the screen.)

---

### Task 5: Summary, PDF and "Mit budget"

**Files:**
- Create: `components/skole/Summary.tsx`, `components/skole/pdf.ts`, `components/skole/MyBudget.tsx`

- [ ] **Step 1: Create `components/skole/Summary.tsx`**

```tsx
import { addMonths, caseById, dayMonthYear, monthYear, steps, totals, type Flow } from "@/lib/skole";
import { Star } from "./Icons";
import { Donut, Legend } from "./Meter";
import s from "./skole.module.css";

interface Props {
  code: string;
  flow: Flow;
  refl: Record<number, string>;
  onRefl: (step: number, text: string) => void;
  onBudget: () => void;
  onPdf: () => void;
  onRestart: () => void;
  /** Where "Prøv budgetpro" goes (the main site). */
  mainSite: string;
}

export function Summary({ code, flow, refl, onRefl, onBudget, onPdf, onRestart, mainSite }: Props) {
  const c = caseById(flow.caseId);
  const t = totals(flow);
  const now = new Date();
  return (
    <div className={s.wrap}>
      <div className={s.titleBlock}>
        <h1 className={s.h1}>{c.gen} budget</h1>
        <span className={s.sub}>
          Elevkode <b>{code}</b> · {dayMonthYear(now)}
        </span>
      </div>
      <div className={s.sumGrid}>
        <div className={`${s.card} ${s.sumCard}`}>
          <Donut t={t} big />
          <Legend t={t} />
          <div className={s.star}>
            <Star />
            <span>
              {c.dream} klar i {monthYear(addMonths(now, flow.months))}
            </span>
          </div>
        </div>
        <div className={s.stack}>
          <h2 className={s.h2}>Dine svar</h2>
          {steps(c)
            .slice(1)
            .map((st, i) => (
              <label key={st.short} className={s.reflField}>
                <span className={s.reflQ}>
                  {i + 1}. {st.refl}
                </span>
                <textarea className={s.textarea} rows={2} maxLength={1000} placeholder="Skriv dit svar" value={refl[i + 2] ?? ""} onChange={(e) => onRefl(i + 2, e.target.value)} />
              </label>
            ))}
          <span className={s.small}>Dine svar bliver kun gemt på denne computer.</span>
        </div>
      </div>
      <div className={s.actions}>
        <button type="button" className={`${s.btn} ${s.btnOutline}`} onClick={onBudget}>
          Lav dit eget budget med budgetposter
        </button>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={onPdf}>
          Gem som PDF
        </button>
        <button type="button" className={s.btn} onClick={onRestart}>
          Start forfra
        </button>
      </div>
      <a href={mainSite} className={s.small}>
        Vil du lave et rigtigt budget derhjemme? Prøv budgetpro.
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/skole/pdf.ts`**

jsPDF and AutoTable are the app's vendor copies (`public/budgetr-app/vendor/`); load them on first use, like the app does. jsPDF's built-in Helvetica has æøå but not `−` or `’`, so swap those.

```ts
import { addMonths, caseById, dayMonthYear, kr, monthYear, segments, steps, totals, type Flow } from "@/lib/skole";

// jsPDF comes from a script tag without types.
type JsPdf = new (options?: object) => any;

function script(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(el);
  });
}

let loading: Promise<JsPdf> | undefined;
function loadJsPdf(): Promise<JsPdf> {
  loading ??= (async () => {
    await script("/budgetr-app/vendor/jspdf.umd.min.js");
    await script("/budgetr-app/vendor/jspdf.plugin.autotable.min.js");
    return (window as any).jspdf.jsPDF as JsPdf;
  })();
  loading.catch(() => (loading = undefined));
  return loading;
}

const plain = (t: string) => t.replace(/−/g, "-").replace(/’/g, "'");

/** Downloads the pupil's summary: the month in a table, the dream date and the reflection answers. */
export async function summaryPdf(code: string, flow: Flow, refl: Record<number, string>, now = new Date()): Promise<void> {
  const Doc = await loadJsPdf();
  const doc = new Doc({ unit: "mm", format: "a4" });
  const c = caseById(flow.caseId);
  const t = totals(flow);
  const left = 18;
  const width = 174;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(22, 32, 29);
  doc.text(plain(`${c.gen} budget`), left, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70, 83, 78);
  doc.text(plain(`Elevkode ${code} · ${dayMonthYear(now)} · budgetpro Skole`), left, 29);

  doc.autoTable({
    startY: 36,
    head: [["Pr. måned", "Beløb"]],
    body: [["Indtægt", kr(t.income)], ...segments(t).map((x) => [x.label, kr(x.amt)]), ["Tilbage", kr(t.left)]].map((r) => r.map(plain)),
    theme: "grid",
    headStyles: { fillColor: [31, 92, 74] },
    columnStyles: { 1: { halign: "right" } },
    margin: { left, right: left },
  });

  let y = doc.lastAutoTable.finalY + 9;
  doc.setTextColor(22, 32, 29);
  doc.setFontSize(11);
  doc.text(plain(`${c.dream} klar i ${monthYear(addMonths(now, flow.months))}`), left, y);
  y += 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Dine svar", left, y);
  y += 8;

  steps(c)
    .slice(1)
    .forEach((st, i) => {
      const q: string[] = doc.splitTextToSize(plain(`${i + 1}. ${st.refl}`), width);
      const a: string[] = doc.splitTextToSize(plain(refl[i + 2]?.trim() || "(intet svar)"), width);
      if (y + (q.length + a.length) * 5 + 6 > 282) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(70, 83, 78);
      doc.text(q, left, y);
      y += q.length * 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(22, 32, 29);
      doc.text(a, left, y);
      y += a.length * 5 + 5;
    });

  doc.save(`budget-${code}.pdf`);
}
```

- [ ] **Step 3: Create `components/skole/MyBudget.tsx`**

```tsx
import { useState } from "react";
import {
  addMonths, boligLevel, budgetNumbers, caseById, CATS, FREQS, kr, MAX_POSTS, monthly, monthYear, opsLevel, seedPosts, signedKr,
  type Cat, type Flow, type Freq, type Post,
} from "@/lib/skole";
import s from "./skole.module.css";
import type { Update } from "./StudentApp";

const toAmount = (v: string) => Math.max(0, Math.min(1_000_000, Number(v) || 0));
const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function MyBudget({ flow, update, onBack }: { flow: Flow; update: Update; onBack: () => void }) {
  const c = caseById(flow.caseId);
  const posts = flow.posts ?? seedPosts(flow);
  const setPosts = (fn: (ps: Post[]) => Post[]) => update((f) => ({ posts: fn(f.posts ?? seedPosts(f)) }));
  const n = budgetNumbers(posts, c);
  const [nf, setNf] = useState<{ name: string; cat: Cat; amt: string; freq: Freq }>({ name: "", cat: "hverdag", amt: "", freq: "md" });
  const canAdd = nf.name.trim() !== "" && Number(nf.amt) > 0 && posts.length < MAX_POSTS;
  const bl = boligLevel(n.boligPct);
  const ol = opsLevel(n.opsPct);
  const dreamDate = n.monthsToDream ? monthYear(addMonths(new Date(), n.monthsToDream)) : null;
  const spend = n.byCat.bolig + n.byCat.faste + n.byCat.hverdag + n.byCat.ops;
  const scale = Math.max(n.income, spend) || 1;

  const kpis: { l: string; v: string; note: string; tone?: "pos" | "neg"; lvl?: number; pill?: string }[] = [
    { l: "Tilbage pr. måned", v: signedKr(n.left), tone: n.left < 0 ? "neg" : "pos", lvl: n.left < 0 ? 2 : 0, pill: n.left < 0 ? "Går ikke op" : "Går op", note: "Indtægt minus alle udgifter og opsparing." },
    { l: "Rådighed pr. dag", v: kr(n.raad / 30), note: `Rådighedsbeløb ${kr(n.raad)}/md. efter bolig og faste udgifter.` },
    { l: "Boligandel", v: `${n.boligPct} %`, lvl: bl, pill: ["Fint", "Hold øje", "For højt"][bl], note: "Tommelfingerregel: højst 30 % af indtægten." },
    { l: "Opsparingsrate", v: `${n.opsPct} %`, lvl: ol, pill: ["Fint", "Lidt lavt", "For lavt"][ol], note: "Tommelfingerregel: mindst 10 % af indtægten." },
    {
      l: `${c.dream} klar om`,
      v: n.monthsToDream ? `${n.monthsToDream} mdr.` : "–",
      note: dreamDate ? `${kr(c.dreamAmt)} · klar i ${dreamDate}` : `Tilføj en opsparingspost, der hedder "${c.dream}".`,
    },
  ];

  const addPost = () => {
    if (!canAdd) return;
    setPosts((ps) => [...ps, { id: newId(), cat: nf.cat, name: nf.name.trim().slice(0, 40), amt: toAmount(nf.amt), freq: nf.freq }]);
    setNf((x) => ({ ...x, name: "", amt: "" }));
  };

  return (
    <div className={`${s.wrap} ${s.wrapWide}`}>
      <div className={s.titleBlock}>
        <h1 className={s.q}>{c.gen} budget</h1>
        <span className={s.note}>Tilføj, ret og slet budgetposter. Nøgletallene regnes med det samme.</span>
      </div>

      <div className={s.kpis}>
        {kpis.map((k) => (
          <div key={k.l} className={`${s.card} ${s.kpi}`}>
            <span className={s.kpiL}>{k.l}</span>
            <span className={s.kpiV} data-tone={k.tone}>
              {k.v}
            </span>
            {k.lvl != null && (
              <span className={s.lvl} data-l={k.lvl}>
                {k.pill}
              </span>
            )}
            <span className={s.kpiNote}>{k.note}</span>
          </div>
        ))}
      </div>

      <div className={s.bGrid}>
        <div className={s.stack}>
          {CATS.map((cat) => (
            <section key={cat.key} className={s.card} aria-label={cat.label}>
              <div className={s.groupTitle}>
                <span className={s.swatch} style={{ background: cat.color }} />
                <span>{cat.label}</span>
                <span>{kr(n.byCat[cat.key])}/md.</span>
              </div>
              {posts
                .filter((p) => p.cat === cat.key)
                .map((p) => (
                  <div key={p.id} className={s.postRow}>
                    <div className={s.postMain}>
                      <input
                        className={s.postName}
                        value={p.name}
                        maxLength={40}
                        aria-label="Navn på post"
                        onChange={(e) => {
                          const v = e.target.value;
                          setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, name: v } : x)));
                        }}
                      />
                      {p.freq !== "md" && (
                        <span className={s.postFreq}>
                          {kr(p.amt)} {FREQS[p.freq].long} · {kr(monthly(p))}/md.
                        </span>
                      )}
                    </div>
                    <div className={s.amtBox}>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={p.amt || ""}
                        aria-label={`Beløb for ${p.name}`}
                        onChange={(e) => {
                          const v = toAmount(e.target.value);
                          setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, amt: v } : x)));
                        }}
                      />
                      <span>kr.</span>
                    </div>
                    <button type="button" className={s.del} aria-label={`Slet ${p.name}`} onClick={() => setPosts((ps) => ps.filter((x) => x.id !== p.id))}>
                      ×
                    </button>
                  </div>
                ))}
            </section>
          ))}
        </div>

        <div className={s.side}>
          <form
            className={s.card}
            onSubmit={(e) => {
              e.preventDefault();
              addPost();
            }}
          >
            <span className={s.cardTitle}>Ny budgetpost</span>
            <input className={s.input} value={nf.name} maxLength={40} onChange={(e) => setNf((x) => ({ ...x, name: e.target.value }))} placeholder="Fx Fitness, Gave, Telefon" aria-label="Navn på ny post" />
            <div className={s.chips} role="group" aria-label="Kategori">
              {CATS.map((cat) => (
                <button key={cat.key} type="button" className={s.chip} aria-pressed={nf.cat === cat.key} onClick={() => setNf((x) => ({ ...x, cat: cat.key }))}>
                  <span className={s.swatch} style={{ background: cat.color }} />
                  {cat.label}
                </button>
              ))}
            </div>
            <div className={s.newAmt}>
              <div className={s.amtBox}>
                <input type="number" inputMode="decimal" min={0} value={nf.amt} onChange={(e) => setNf((x) => ({ ...x, amt: e.target.value }))} placeholder="Beløb" aria-label="Beløb" />
                <span>kr.</span>
              </div>
              <div className={s.seg} role="group" aria-label="Hvor tit">
                {(Object.keys(FREQS) as Freq[]).map((k) => (
                  <button key={k} type="button" aria-pressed={nf.freq === k} onClick={() => setNf((x) => ({ ...x, freq: k }))}>
                    {FREQS[k].short}
                  </button>
                ))}
              </div>
            </div>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={!canAdd}>
              Tilføj post
            </button>
          </form>

          <div className={s.card}>
            <div className={s.sumLine} style={{ fontSize: 17, padding: 0 }}>
              <span>Hvor går pengene hen?</span>
              <span>{kr(n.income)}/md.</span>
            </div>
            <div className={s.bar}>
              {CATS.slice(1).map((cat) => (
                <div key={cat.key} style={{ width: `${(n.byCat[cat.key] / scale) * 100}%`, background: cat.color }} />
              ))}
            </div>
            {CATS.slice(1).map((cat) => (
              <div key={cat.key} className={s.legendRow}>
                <span className={s.swatch} style={{ background: cat.color }} />
                <span className={s.legendName}>{cat.label}</span>
                <span className={s.legendAmt}>{n.income > 0 ? Math.round((n.byCat[cat.key] / n.income) * 100) : 0} %</span>
              </div>
            ))}
            <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => update({ posts: seedPosts(flow) })}>
              Hent mine valg fra trinene igen
            </button>
          </div>

          <button type="button" className={s.btn} onClick={onBack}>
            Tilbage til opsummering
          </button>
        </div>
      </div>
    </div>
  );
}
```

(No commit yet – Task 6 wires it together.)

---

### Task 6: `StudentApp` and the `/skole` route

**Files:**
- Create: `components/skole/StudentApp.tsx`, `app/skole/layout.tsx`, `app/skole/page.tsx`

- [ ] **Step 1: Create `components/skole/StudentApp.tsx`**

Plan 2 replaces `begin` with a server lookup and adds saving; keep the structure so that change stays small.

```tsx
"use client";

import { useEffect, useState } from "react";
import { emptyFlow, isCode, normalizeCode, seedPosts, type Flow } from "@/lib/skole";
import { FlowView } from "./FlowView";
import { MyBudget } from "./MyBudget";
import { summaryPdf } from "./pdf";
import { Shell } from "./Shell";
import s from "./skole.module.css";
import { Start } from "./Start";
import { Summary } from "./Summary";
import { useToast } from "./useToast";

type Screen = "start" | "flow" | "sum" | "budget";
export type Update = (patch: Partial<Flow> | ((f: Flow) => Partial<Flow>)) => void;

// The reflection answers stay in this browser only (free text may hold names).
const answersKey = (code: string) => `budgetpro-skole:svar:${code}`;
function loadAnswers(code: string): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(answersKey(code)) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function StudentApp() {
  const [screen, setScreen] = useState<Screen>("start");
  const [code, setCode] = useState("");
  /** The code whose flow is loaded (null before the first start). */
  const [opened, setOpened] = useState<string | null>(null);
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [flow, setFlow] = useState<Flow>(emptyFlow);
  const [reveal, setReveal] = useState(0);
  const [refl, setRefl] = useState<Record<number, string>>({});
  const [toast, showToast] = useToast();

  const update: Update = (patch) => setFlow((f) => ({ ...f, ...(typeof patch === "function" ? patch(f) : patch) }));

  // Step 2 shows the pay slip one line every half second.
  const revealing = screen === "flow" && flow.step === 2 && reveal < 3;
  useEffect(() => {
    if (!revealing) return;
    const timers = [1, 2, 3].map((i) => setTimeout(() => setReveal((r) => Math.max(r, i)), 500 * i));
    return () => timers.forEach(clearTimeout);
  }, [revealing]);

  useEffect(() => window.scrollTo(0, 0), [screen, flow.step]);

  const open = (c: string, f: Flow) => {
    setCode(c);
    setOpened(c);
    setFlow(f);
    setReveal(f.maxStep > 2 ? 3 : 0);
    setRefl(loadAnswers(c));
    setScreen(f.done ? "sum" : "flow");
  };

  const begin = () => {
    const c = normalizeCode(code);
    if (!isCode(c)) return setCodeErr("Skriv den kode, du har fået af din lærer.");
    if (c === opened) return setScreen("flow");
    open(c, emptyFlow());
  };

  const go = (n: number) => {
    update((f) => ({ step: n, maxStep: Math.max(f.maxStep, n) }));
    setScreen("flow");
  };

  const answer = (step: number, text: string) =>
    setRefl((r) => {
      const next = { ...r, [step]: text };
      try {
        localStorage.setItem(answersKey(code), JSON.stringify(next));
      } catch {}
      return next;
    });

  const restart = () => {
    if (!window.confirm("Vil du starte forfra? Dine valg og svar bliver slettet.")) return;
    try {
      localStorage.removeItem(answersKey(code));
    } catch {}
    setFlow(emptyFlow());
    setReveal(0);
    setRefl({});
    setScreen("flow");
  };

  const right =
    screen === "start" ? null : (
      <span className={s.codeChip}>
        <span className={s.codeLabel}>Elevkode</span>
        <b>{code}</b>
      </span>
    );

  return (
    <Shell right={right} toast={toast}>
      {screen === "start" && (
        <Start
          code={code}
          error={codeErr}
          busy={false}
          onCode={(v) => {
            setCode(v);
            setCodeErr(null);
          }}
          onStart={begin}
        />
      )}
      {screen === "flow" && (
        <FlowView
          flow={flow}
          update={update}
          go={go}
          reveal={reveal}
          onBack={() => (flow.step === 1 ? setScreen("start") : go(flow.step - 1))}
          onFinish={() => {
            update({ done: true });
            setScreen("sum");
          }}
        />
      )}
      {screen === "sum" && (
        <Summary
          code={code}
          flow={flow}
          refl={refl}
          onRefl={answer}
          onBudget={() => {
            update((f) => ({ posts: f.posts ?? seedPosts(f) }));
            setScreen("budget");
          }}
          onPdf={() => summaryPdf(code, flow, refl).catch(() => showToast("PDF’en kunne ikke laves. Prøv igen."))}
          onRestart={restart}
          mainSite="/"
        />
      )}
      {screen === "budget" && <MyBudget flow={flow} update={update} onBack={() => setScreen("sum")} />}
    </Shell>
  );
}
```

- [ ] **Step 2: Create `app/skole/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";

// The school version's type (docs/design/skole-skitse.html); the wordmark keeps the brand fonts from app/layout.tsx.
const skole = Schibsted_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-skole",
  display: "swap",
});

export const metadata: Metadata = {
  title: "budgetpro Skole – hvad koster det at være voksen?",
  description: "Lav et månedsbudget for en fremtidsperson i 8 trin. Til udskolingen.",
};

export default function SkoleLayout({ children }: { children: React.ReactNode }) {
  return <div className={skole.variable}>{children}</div>;
}
```

- [ ] **Step 3: Create `app/skole/page.tsx`**

```tsx
import { StudentApp } from "@/components/skole/StudentApp";

export default function SkolePage() {
  return <StudentApp />;
}
```

- [ ] **Step 4: Typecheck and test**

Run: `pnpm typecheck` then `pnpm test`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Click through it by hand**

Run `pnpm dev`, open `http://localhost:3200/skole` and check:
1. "Start" with an empty field shows "Skriv den kode, du har fået af din lærer."; `blå orm 47` works and the header shows `BLÅ-ORM-47`.
2. Step 1: "Næste" is grey until a person is chosen. Step 2: the three lines appear one by one, then "Næste" works.
3. Choose Sara, Delelejlighed, all fixed costs, Normalt/Normalt. Step 7 shows `+2.473 kr.` and "Budgettet går op."
4. Step 8: "Huslejen stiger 10 %" shows "Forskel −480 kr." in the meter.
5. Summary: "Saras budget", the 7 questions; "Gem som PDF" downloads `budget-BLÅ-ORM-47.pdf` with æøå readable.
6. "Lav dit eget budget med budgetposter": "Tilbage pr. måned +2.473 kr."; adding "Fitness 250" in "Faste udgifter" lowers it to `+2.223 kr.`.
7. At 390 px wide (devtools): no sideways scrolling on any screen; the meter sits above the question.

Screenshot for the record:
`pnpm dlx playwright@1.63.0 screenshot --browser=chromium --channel=chrome --full-page '--viewport-size=390,844' http://localhost:3200/skole smoke-out/skole-start.png`

- [ ] **Step 6: Build**

Run: `pnpm build`
Expected: build succeeds, `/skole` listed.

- [ ] **Step 7: Commit**

```bash
git add components/skole app/skole
git commit -m "Skole: pupil flow at /skole with 8 steps, summary, PDF and Mit budget" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
