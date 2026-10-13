/**
 * budgetpro Skole's demo class: a made-up 9th grade with pupils at different steps, so a teacher without a seat can
 * see what the class overview shows before the school signs up. Made from the same rules as a real class
 * (pupilRow, classStats, pupilDetail in lib/skole.ts); nothing is stored. No server imports.
 */
import { classStats, emptyFlow, pupilDetail, pupilRow, type Answers, type ClassView, type Flow, type PupilDetail } from "./skole";

export const DEMO_CLASS_ID = "demo";
const DAY_MS = 24 * 60 * 60 * 1000;

const flow = (f: Partial<Flow>): Flow => ({ ...emptyFlow(), ...f });
const all = { forsikring: true, mobil: true, internet: true, transport: true, fag: true, stream: true };

const PUPILS: { code: string; flow: Flow | null; answers: Answers }[] = [
  {
    code: "BLÅ-ODDER-23",
    flow: flow({ caseId: "jonas", step: 8, maxStep: 8, done: true, bolig: 4800, faste: all, mad: 2800, toj: 1500, buffer: 1000, months: 12, scen: { rent: true } }),
    answers: {
      2: "Næsten en tredjedel. Det havde jeg ikke regnet med.",
      3: "Mere plads og mit eget køkken, men så er der færre penge til resten.",
      4: "Streaming og måske internet, hvis han bruger mobilen.",
      5: "Mad er et behov. Nyt tøj hver måned er et ønske.",
      6: "Ja, hvis han sparer 500 kr mere op og venter med at købe ting.",
      7: "Jeg tog den billigere mad.",
      8: "Hvis huslejen stiger, for den kan han ikke lave om på.",
    },
  },
  {
    code: "GUL-SÆL-58",
    flow: flow({ caseId: "mira", step: 8, maxStep: 8, done: true, bolig: 3500, faste: { ...all, stream: false, fag: false }, mad: 2000, toj: 800, buffer: 500, months: 18, scen: { job: true } }),
    answers: {
      2: "Ikke så meget, fordi hun tjener mindre.",
      3: "Et værelse er billigst. Hun får ikke så meget plads.",
      4: "Streaming. Hun kan bruge sin vens konto.",
      5: "Mad er et behov.",
      6: "Det tager lang tid på SU.",
      7: "Jeg fjernede streaming og fagforening.",
      8: "At miste fritidsjobbet.",
    },
  },
  {
    code: "GRØN-UGLE-41",
    flow: flow({ caseId: "sara", step: 7, maxStep: 7, bolig: 6900, faste: all, mad: 3800, toj: 2500, buffer: 1500, months: 6 }),
    answers: { 2: "Ret meget.", 3: "Hun får sin egen lejlighed.", 4: "Ingen af dem.", 5: "Tøj er et ønske." },
  },
  {
    code: "LILLA-RÆV-17",
    flow: flow({ caseId: "jonas", step: 5, maxStep: 5, bolig: 4800, faste: { ...all, stream: false }, mad: 2800 }),
    answers: { 2: "Ca. 10.000 kr.", 3: "En delelejlighed er et godt kompromis." },
  },
  {
    code: "STOR-HARE-62",
    flow: flow({ caseId: "sara", step: 3, maxStep: 3 }),
    answers: { 2: "Mere end jeg troede." },
  },
  { code: "SJOV-LAKS-35", flow: null, answers: {} },
];

/** The demo class as the class overview shows it, and each pupil's choices and answers. */
export function demoClass(now = new Date()): { view: ClassView; pupils: Record<string, PupilDetail> } {
  const flows = PUPILS.map((p) => p.flow);
  const created = new Date(now.getTime() - 9 * DAY_MS);
  return {
    view: {
      id: DEMO_CLASS_ID,
      trin: 9,
      codes: PUPILS.map((p) => p.code),
      created: created.toISOString(),
      expires: new Date(created.getTime() + 90 * DAY_MS).toISOString(),
      days: 90,
      rows: PUPILS.map((p) => pupilRow(p.code, p.flow)),
      stats: classStats(flows),
    },
    pupils: Object.fromEntries(PUPILS.map((p) => [p.code, pupilDetail(p.code, p.flow, p.answers)])),
  };
}
