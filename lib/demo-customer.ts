/**
 * The demo customer behind /demobruger: a fictional family (Sofie and Mikkel with two children) whose budget uses
 * every part of the app – drafts of all three kinds, scenarios, goals of both modes with extra deposits, loans
 * (paused and left out), price history, tasks, reminders and milestones. Every name and amount here is made up.
 *
 * Dates are relative to `now`, so goals, the update reminder and milestones look the same whenever the demo is reset.
 */

type Obj = Record<string, unknown>;
type Budget = Obj & { entries: Obj[]; goals: Obj[]; settings: Obj };

const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];

export const DEMO_USER = "demo";

export function demoCustomer(now = new Date()) {
  // "YYYY-MM-DD" n months from now (negative = back in time), on the given day.
  const iso = (n: number, day = 1) => {
    const d = new Date(now.getFullYear(), now.getMonth() + n, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const monthText = (n: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + n, 1);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const e = (id: string, type: string, desc: string, amount: number, o: Obj = {}): Obj => ({
    id, type, desc, amount, key: "", category: "", freq: 1, start: 1, account: "budget", payer: "faelles",
    active: true, check: false, note: "", ...o,
  });
  const inc = (id: string, desc: string, amount: number, o?: Obj) => e(id, "indtaegt", desc, amount, o);
  const exp = (id: string, category: string, desc: string, amount: number, o?: Obj) =>
    e(id, "udgift", desc, amount, { category, ...o });
  const move = (id: string, desc: string, amount: number, from: string, to: string, o?: Obj) =>
    e(id, "overfoersel", desc, amount, { account: "", payer: "", from, to, auto: true, ...o });

  const persons = [
    { id: "p1", name: "Sofie", savings: 0 },
    { id: "p2", name: "Mikkel", savings: 6000 },
  ];

  const accounts = [
    { id: "budget", name: "Budgetkonto", number: "", type: "faelles", owner: "", startSaldo: 8400, saldo: 8400, saldoDate: iso(0) },
    { id: "sofie", name: "Sofie – lønkonto", number: "", type: "personlig", owner: "p1", startSaldo: 0 },
    { id: "mikkel", name: "Mikkel – lønkonto", number: "", type: "personlig", owner: "p2", startSaldo: 0 },
    { id: "mad", name: "Madkonto", number: "", type: "faelles", owner: "", startSaldo: 1200, saldo: 1200, saldoDate: iso(0) },
    { id: "hus", name: "Husopsparing", number: "", type: "faelles", owner: "", startSaldo: 112000, saldo: 112000, saldoDate: iso(-1) },
    { id: "ferie", name: "Feriekonto", number: "", type: "faelles", owner: "", startSaldo: 0, todo: "Opret kontoen i banken", todoSince: iso(-1, 12), made: false, madeSince: iso(-1, 12) },
    { id: "boern", name: "Børneopsparing", number: "", type: "faelles", owner: "", startSaldo: 0 },
  ];

  const entries = [
    inc("i1", "Løn Sofie", 34200, { account: "sofie", payer: "p1", note: "Udbetalt efter skat" }),
    inc("i2", "Løn Mikkel", 27800, { account: "mikkel", payer: "p2", note: "Udbetalt efter skat",
      history: [{ date: iso(-14), amount: 26900, freq: 1, desc: "Før lønforhandling" }], since: iso(-2) }),
    inc("i3", "Børnefamilieydelse", 4800, { account: "sofie", payer: "p1", freq: 3, start: 1, cover: "budget", free: false }),
    inc("i4", "Børnetilskud", 1350, { account: "sofie", payer: "p1", freq: 3, start: 1, free: false }),
    inc("i5", "Freelance Mikkel", 2000, { account: "mikkel", payer: "p2", freq: 0, extra: true, split: false, note: "Svinger fra måned til måned" }),
    exp("b1", "Bolig", "Realkreditlån", 11900, { key: "Lån 1" }),
    exp("b2", "Bolig", "Ejendomsskat", 9600, { freq: 6, start: 1 }),
    exp("b3", "Bolig", "El", 1550, { note: "Aconto, hævet efter prisstigning",
      history: [{ date: iso(-11), amount: 1250, freq: 1, desc: "Aconto sidste år" }], since: iso(-2) }),
    exp("b4", "Bolig", "Fjernvarme", 1150),
    exp("b5", "Bolig", "Vand og renovation", 2600, { freq: 3, start: 2 }),
    exp("b6", "Bolig", "Husforsikring", 5700, { freq: 12, start: 3 }),
    exp("b7", "Bolig", "Grundejerforening", 1800, { freq: 12, start: 4, check: true, note: "Tjek beløbet ved næste generalforsamling" }),
    exp("t1", "Transport", "Billån", 3300, { key: "Billån" }),
    exp("t2", "Transport", "Brændstof", 1700),
    exp("t3", "Transport", "Bilforsikring", 6900, { freq: 6, start: 4 }),
    exp("t4", "Transport", "Vægtafgift", 2700, { freq: 6, start: 5 }),
    exp("t5", "Transport", "Service på bilen", 4500, { freq: 12, start: 9 }),
    exp("k1", "Børn", "Institution", 5400, { note: "Vuggestue og børnehave" }),
    exp("k2", "Børn", "Fritidsaktiviteter", 500, { todo: "Tjek prisen på svømning til foråret", todoSince: iso(0, 2) }),
    exp("k3", "Børn", "Tandlæge og briller", 2400, { freq: 6, start: 2 }),
    exp("k4", "Børn", "Børneopsparing", 1000, { account: "boern", cover: "budget", bank: false }),
    exp("f1", "Forsikring", "Indbo og ulykke", 560),
    exp("f2", "Forsikring", "Rejseforsikring", 1100, { freq: 12, start: 5 }),
    exp("a1", "Abonnementer", "Internet", 299),
    exp("a2", "Abonnementer", "Streaming", 249),
    exp("a3", "Abonnementer", "Mobil Sofie", 149, { account: "sofie", payer: "p1" }),
    exp("a4", "Abonnementer", "Mobil Mikkel", 179, { account: "mikkel", payer: "p2" }),
    exp("a5", "Abonnementer", "Musiktjeneste", 119, { active: false, note: "Opsagt, kører til udgangen af måneden" }),
    exp("h1", "Husholdning", "Mad og husholdning", 9200, { account: "mad", cover: "budget" }),
    exp("h2", "Husholdning", "Tøj og personlig pleje", 1500),
    exp("s1", "Personligt", "A-kasse og fagforening Sofie", 840, { account: "sofie", payer: "p1" }),
    exp("s2", "Personligt", "A-kasse og fagforening Mikkel", 810, { account: "mikkel", payer: "p2" }),
    exp("s3", "Personligt", "Fitness Sofie", 299, { account: "sofie", payer: "p1" }),
    exp("s4", "Personligt", "Studielån Mikkel", 1050, { account: "mikkel", payer: "p2", key: "SU-lån" }),
    exp("g1", "Gaver", "Gaver og fødselsdage", 600, { bank: false }),
    exp("g2", "Gaver", "Jul", 4000, { freq: 12, start: 12, bank: false }),
    move("o1", "Sofie til budgetkonto", 23500, "sofie", "budget"),
    move("o2", "Mikkel til budgetkonto", 18200, "mikkel", "budget"),
  ];

  const goals = [
    { id: "gh", name: "Udbetaling til hus", mode: "target", target: 300000, saved: 112000, start: iso(-12), end: iso(32),
      from: "budget", to: "hus", payer: "faelles", active: true, note: "Mindst 10 % af prisen", scopes: ["base", "sc1"],
      extras: [{ date: iso(-3, 15), amount: 10000, desc: "Feriepenge" }, { date: iso(5, 15), amount: 15000, desc: "Skatteretur" }] },
    { id: "gf", name: "Sommerferie", mode: "monthly", monthly: 1500, saved: 3000, start: iso(-2), end: iso(9),
      from: "budget", to: "ferie", payer: "faelles", active: true, note: "", scopes: ["base", "sc1", "sc2"], extras: [] },
    { id: "gs", name: "Sofies buffer", mode: "monthly", monthly: 800, saved: 0, start: iso(0), end: iso(12),
      from: "sofie", to: "sofie", payer: "p1", active: true, note: "", scopes: ["base"], extras: [] },
    { id: "gb", name: "Ny cykel til Mikkel", mode: "target", target: 9000, saved: 2500, start: iso(-1), end: iso(7),
      from: "mikkel", to: "mikkel", payer: "p2", active: true, note: "", scopes: ["base", "sc2"], extras: [] },
    { id: "gx", name: "Barselsbuffer", mode: "target", target: 40000, saved: 0, start: iso(0), end: iso(6),
      from: "budget", to: "budget", payer: "faelles", active: true, note: "Kun i scenariet om barsel", scopes: ["sc2"], extras: [] },
  ];

  const loans = [
    { id: "l1", bank: "Realkredit", desc: "Realkreditlån", original: 2300000, rest: 1795000, monthly: 11900, rate: 4.2, ends: "2053 - jun", restDate: monthText(-1), link: "b1", paused: false, note: "" },
    { id: "l2", bank: "Bilfinansiering", desc: "Billån", original: 175000, rest: 26000, monthly: 3300, rate: 5.9, ends: "2027 - apr", restDate: monthText(-1), link: "t1", paused: false, note: "Bilen er betalt ud til foråret" },
    { id: "l3", bank: "Staten", desc: "Studielån", original: 115000, rest: 61000, monthly: 1050, rate: 4.6, ends: "2032 - feb", restDate: monthText(-3), link: "s4", paused: false, note: "" },
    { id: "l4", bank: "Banken", desc: "Kassekredit", original: 30000, rest: 8000, monthly: 1000, rate: 9.5, ends: "2027 - jun", restDate: monthText(-1), link: "", paused: true, include: false, note: "Bruges kun i nødstilfælde" },
  ];

  const scenarios = [
    { id: "sc1", name: "Nyt hus", from: monthText(8), overrides: { b1: { amount: 15800 }, b4: { active: false, removed: true } },
      added: [exp("sc1a", "Bolig", "Varmepumpe, el", 900), exp("sc1b", "Bolig", "Vedligehold af huset", 1500)],
      saldo: { hus: { amount: 300000, date: iso(8) } } },
    { id: "sc2", name: "Barsel Sofie", from: monthText(4), overrides: { i1: { amount: 21500 }, o1: { amount: 12500 }, s3: { active: false, removed: true } },
      added: [inc("sc2a", "Barselsdagpenge, top-up", 2500, { account: "sofie", payer: "p1" })] },
  ];

  const settings = {
    title: "Familiens budget",
    split: "indkomst",
    manualPct: 50,
    withExtra: false,
    withBound: true,
    devPct: 10,
    bank: { adults: 12000, children: 2, childRate: 3000, withExtra: false },
    categories: ["Bolig", "Transport", "Børn", "Forsikring", "Abonnementer", "Husholdning", "Personligt", "Gaver"],
    // The last change was four months ago, so the 3-month update reminder and the goal milestones show at login.
    milestones: true,
    touched: iso(-4),
    remind: { every: 3, mail: false, sms: false },
  };

  const budget: Budget = { version: 1, persons, accounts, entries, goals, loans, loanUpdated: iso(-1, 20), scenarios, settings };
  const copy = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

  // Draft 1, "copy": next year's budget, a copy of today's with new prices and only the base goals.
  const next = copy({ ...budget, scenarios: [] });
  next.goals = next.goals.filter((g) => (g.scopes as string[]).includes("base")).map((g) => ({ ...g, scopes: ["base"] }));
  const raise: Record<string, number> = { b1: 12100, b3: 1650, b4: 1250, h1: 9600, k1: 5600, a2: 279 };
  next.entries.forEach((x) => { if (raise[x.id as string]) x.amount = raise[x.id as string]; });
  next.entries = next.entries.filter((x) => x.id !== "t1");
  next.settings = { ...next.settings, title: `Budget ${now.getFullYear() + 1}` };

  // Draft 2, "blank": built from three months of statements (only the chosen entries are kept, never the transactions).
  const fromStatements = {
    version: 1,
    persons: copy(persons).map((p) => ({ ...p, savings: 0 })),
    accounts: [
      { id: "budget", name: "Budgetkonto", number: "", type: "faelles", owner: "", startSaldo: 0 },
      { id: "sofie", name: "Sofie – lønkonto", number: "", type: "personlig", owner: "p1", startSaldo: 0 },
      { id: "mikkel", name: "Mikkel – lønkonto", number: "", type: "personlig", owner: "p2", startSaldo: 0 },
    ],
    entries: [
      inc("di1", "Løn Sofie", 34150, { account: "sofie", payer: "p1" }),
      inc("di2", "Løn Mikkel", 27820, { account: "mikkel", payer: "p2" }),
      exp("dx1", "Bolig & forsyning", "Realkredit", 11900),
      exp("dx2", "Bolig & forsyning", "Fjernvarme", 1150),
      exp("dx3", "Bolig & forsyning", "El", 1550),
      exp("dx4", "Husholdning", "Supermarked", 8700, { note: "Gennemsnit af tre måneder" }),
      exp("dx5", "Transport", "Tankstation", 1850),
      exp("dx6", "Abonnementer", "Streaming", 249),
      exp("dx7", "Kommunikation", "Internet", 299),
      exp("dx8", "Børn", "Institution", 5400),
      exp("dx9", "Importeret", "Kortbetalinger, diverse", 2300, { check: true, note: "Fordel på kategorier" }),
      move("do1", "Sofie til budgetkonto", 23500, "sofie", "budget"),
      move("do2", "Mikkel til budgetkonto", 18200, "mikkel", "budget"),
    ],
    goals: [],
    loans: [],
    scenarios: [],
    settings: { split: "indkomst", manualPct: 50, title: "Fra kontoudskrifter", bank: copy(settings.bank), remind: copy(settings.remind), milestones: true },
  };
  const span = { from: iso(-3), to: iso(0, 0) };
  const files = [
    { name: "budgetkonto-3-maaneder.csv", n: 214, ...span, account: "budget", added: iso(0, 1) },
    { name: "sofie-loenkonto.xlsx", n: 96, ...span, account: "sofie", added: iso(0, 1) },
    { name: "mikkel-kontoudskrift.pdf", n: 88, ...span, account: "mikkel", added: iso(0, 1) },
  ];

  // Draft 3, "prev": the budget that was primary before the current one (kept when a draft was made primary).
  const prev = copy({ ...budget, scenarios: [] });
  prev.goals = prev.goals.filter((g) => g.id === "gh").map((g) => ({ ...g, scopes: ["base"], extras: [] }));
  const older: Record<string, number> = { i2: 26900, b3: 1250, h1: 8800, k1: 5200, o2: 17400 };
  prev.entries.forEach((x) => { if (older[x.id as string]) x.amount = older[x.id as string]; });
  prev.entries = prev.entries.filter((x) => !["b7", "k4", "t5"].includes(x.id as string));

  budget.drafts = [
    { id: "d1", name: `Budget ${now.getFullYear() + 1}`, created: iso(0, 1), mode: "copy", files: [], data: next },
    { id: "d2", name: "Fra kontoudskrifter", created: iso(0, 1), mode: "blank", files, data: fromStatements },
    { id: "d3", name: `Tidligere budget, 3. ${monthText(-4)}`, created: iso(-4, 3), mode: "prev", files: [], data: prev },
  ];

  return budget;
}
