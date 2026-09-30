// Fictional example budget for the landing page screenshots (scripts/landing-shots.mjs).
// Anna and Jonas with two children. Every name and amount here is made up.
const e = (id, type, desc, amount, o = {}) => ({
  id, type, desc, amount, key: "", category: "", freq: 1, start: 1, account: "budget", payer: "faelles", active: true, check: false, note: "", ...o,
});
const inc = (id, desc, amount, o) => e(id, "indtaegt", desc, amount, o);
const exp = (id, category, desc, amount, o) => e(id, "udgift", desc, amount, { category, ...o });

export const demoBudget = {
  version: 1,
  persons: [
    { id: "p1", name: "Anna", savings: 0 },
    { id: "p2", name: "Jonas", savings: 0 },
  ],
  accounts: [
    { id: "budget", name: "Budgetkonto", number: "", type: "faelles", owner: "", startSaldo: 0 },
    { id: "anna", name: "Anna – lønkonto", number: "", type: "personlig", owner: "p1", startSaldo: 0 },
    { id: "jonas", name: "Jonas – lønkonto", number: "", type: "personlig", owner: "p2", startSaldo: 0 },
    { id: "mad", name: "Madkonto", number: "", type: "faelles", owner: "", startSaldo: 0 },
    { id: "hus", name: "Husopsparing", number: "", type: "faelles", owner: "", startSaldo: 0 },
    { id: "ferie", name: "Ferie", number: "", type: "faelles", owner: "", startSaldo: 0 },
  ],
  entries: [
    inc("i1", "Løn Anna", 33400, { account: "anna", payer: "p1", note: "Udbetalt efter skat" }),
    inc("i2", "Løn Jonas", 26100, { account: "jonas", payer: "p2", note: "Udbetalt efter skat" }),
    inc("i3", "Børnefamilieydelse", 4800, { account: "anna", payer: "p1", freq: 3, start: 1, cover: "budget" }),
    inc("i4", "Freelance Jonas", 1500, { account: "jonas", payer: "p2", freq: 0, extra: true, split: false }),
    exp("b1", "Bolig", "Realkreditlån", 11800, { key: "Lån 1" }),
    exp("b2", "Bolig", "Ejendomsskat", 9900, { freq: 6, start: 1 }),
    exp("b3", "Bolig", "El", 1450, { note: "Aconto, justeret i august" }),
    exp("b4", "Bolig", "Fjernvarme", 1100),
    exp("b5", "Bolig", "Vand", 2400, { freq: 3, start: 2 }),
    exp("b6", "Bolig", "Husforsikring", 5400, { freq: 12, start: 3 }),
    exp("t1", "Transport", "Billån", 3450, { key: "Billån" }),
    exp("t2", "Transport", "Brændstof", 1600),
    exp("t3", "Transport", "Bilforsikring", 6600, { freq: 6, start: 4 }),
    exp("t4", "Transport", "Vægtafgift", 2640, { freq: 6, start: 5 }),
    exp("k1", "Børn", "Institution", 5200, { note: "To børn" }),
    exp("k2", "Børn", "Fritidsaktiviteter", 450, { check: true }),
    exp("f1", "Forsikring", "Indbo og ulykke", 540),
    exp("a1", "Abonnementer", "Internet", 299),
    exp("a2", "Abonnementer", "Streaming", 239),
    exp("a3", "Abonnementer", "Mobil Anna", 149, { account: "anna", payer: "p1" }),
    exp("a4", "Abonnementer", "Mobil Jonas", 179, { account: "jonas", payer: "p2" }),
    exp("h1", "Husholdning", "Mad og husholdning", 9000, { account: "mad", cover: "budget" }),
    exp("h2", "Husholdning", "Tøj og personlig pleje", 1500),
    exp("s3", "Personligt", "A-kasse og fagforening Anna", 820, { account: "anna", payer: "p1" }),
    exp("s4", "Personligt", "A-kasse og fagforening Jonas", 790, { account: "jonas", payer: "p2" }),
    exp("k3", "Børn", "Tandlæge", 2400, { freq: 6, start: 2 }),
    exp("s1", "Personligt", "Fitness Anna", 299, { account: "anna", payer: "p1" }),
    exp("s2", "Personligt", "Studielån Jonas", 1050, { account: "jonas", payer: "p2", key: "SU-lån" }),
    exp("g1", "Gaver", "Gaver og fødselsdage", 500),
    e("o1", "overfoersel", "Anna til budgetkonto", 22500, { account: "", payer: "", from: "anna", to: "budget", auto: true }),
    e("o2", "overfoersel", "Jonas til budgetkonto", 16800, { account: "", payer: "", from: "jonas", to: "budget", auto: true }),
  ],
  goals: [
    { id: "gh", name: "Udbetaling til hus", mode: "target", target: 250000, saved: 95000, start: "2026-10-01", end: "2029-06-30", from: "budget", to: "hus", payer: "faelles", active: true, note: "", scopes: ["base"], extras: [] },
    { id: "gf", name: "Sommerferie 2027", mode: "monthly", monthly: 1500, start: "2026-10-01", end: "2027-07-01", from: "budget", to: "ferie", payer: "faelles", active: true, note: "", scopes: ["base"], extras: [] },
    { id: "ga", name: "Annas buffer", mode: "monthly", monthly: 800, start: "2026-10-01", end: "2027-10-01", from: "anna", to: "anna", payer: "p1", active: true, note: "", scopes: ["base"], extras: [] },
  ],
  loans: [
    { id: "l1", bank: "Realkredit", desc: "Realkreditlån", original: 2100000, rest: 1640000, monthly: 11800, rate: 4.1, ends: "2052 - jun", restDate: "september 2026", link: "b1", paused: false, note: "" },
    { id: "l2", bank: "Bilfinansiering", desc: "Billån", original: 180000, rest: 21000, monthly: 3450, rate: 5.9, ends: "2027 - mar", restDate: "september 2026", link: "t1", paused: false, note: "" },
    { id: "l3", bank: "Staten", desc: "Studielån", original: 120000, rest: 64000, monthly: 1050, rate: 4.6, ends: "2032 - jan", restDate: "september 2026", link: "s2", paused: false, note: "" },
  ],
  loanUpdated: "2026-09-23",
  scenarios: [{ id: "sc1", name: "Nyt hus fra 2027", from: "april 2027", overrides: { b1: { amount: 15500 } }, added: [] }],
  settings: {
    title: "Vores budget",
    split: "indkomst",
    manualPct: 50,
    withExtra: false,
    withBound: true,
    bank: { adults: 12000, children: 2, childRate: 3000, withExtra: false },
    categories: ["Bolig", "Transport", "Børn", "Forsikring", "Abonnementer", "Husholdning", "Personligt", "Gaver"],
  },
};
