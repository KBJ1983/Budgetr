import { addMonths } from "./format";
import { computeTransfers } from "./transfers";
import type { Budget, BudgetItem, Interval, ItemKind, Month } from "./types";

export const newId = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_BANK_RULE = { perAdult: 6000, perChild: 3250 };

export const GOAL_COLORS = ["#6CC2A2", "#E4B758", "#86B8EE", "#A7B4C8", "#EE8F78"];

export function emptyBudget(name: string, now: Date = new Date()): Budget {
  const iso = now.toISOString();
  return {
    id: newId(),
    name,
    persons: [],
    children: 0,
    accounts: [],
    items: [],
    loans: [],
    goals: [],
    split: { mode: "income", fixedPct: {} },
    registeredTransfers: {},
    scenarios: [],
    bankRule: { ...DEFAULT_BANK_RULE },
    createdAt: iso,
    updatedAt: iso,
  };
}

/**
 * Invented example household (HANDOFF: "Anna og Jonas"). Not real user data.
 * Dates are relative to `now`, so the example stays current.
 */
export function exampleBudget(now: Date = new Date()): Budget {
  const month: Month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const b = emptyBudget("Anna og Jonas’ budget", now);
  b.id = "eksempel";
  b.persons = [
    { id: "anna", name: "Anna" },
    { id: "jonas", name: "Jonas" },
  ];
  b.children = 2;
  b.accounts = [
    { id: "budget", name: "Budgetkonto", ownerId: null, kind: "budget" },
    { id: "anna-lon", name: "Anna – lønkonto", ownerId: "anna", kind: "løn" },
    { id: "jonas-lon", name: "Jonas – lønkonto", ownerId: "jonas", kind: "løn" },
    { id: "opsparing", name: "Fælles opsparing", ownerId: null, kind: "opsparing" },
  ];

  const ago = (months: number) => `${addMonths(month, -months)}-01`;
  const item = (
    id: string,
    name: string,
    kind: ItemKind,
    amount: number,
    accountId: string,
    ownerId: string | null,
    category: string,
    extra: Partial<BudgetItem> & { interval?: Interval } = {},
  ): BudgetItem => ({ id, name, kind, amount, interval: 1, accountId, ownerId, category, history: [], ...extra });

  b.items = [
    item("lon-anna", "Løn Anna", "indtægt", 33500, "anna-lon", "anna", "Løn"),
    item("lon-jonas", "Løn Jonas", "indtægt", 26900, "jonas-lon", "jonas", "Løn"),
    item("bornepenge", "Børne- og ungeydelse", "indtægt", 11400, "budget", null, "Offentlige ydelser", { interval: 3 }),

    item("husleje", "Husleje", "udgift", 9800, "budget", null, "Bolig", { agreementNo: "LEJE 4471" }),
    item("el", "El – Norlys", "udgift", 2455, "budget", null, "Bolig", {
      agreementNo: "NORLYS 88213",
      history: [{ date: ago(2), from: 2150, to: 2455 }],
    }),
    item("varme", "Varme", "udgift", 950, "budget", null, "Bolig"),
    item("internet", "Internet", "udgift", 299, "budget", null, "Bolig"),
    item("forsikring", "Indbo- og ulykkesforsikring", "udgift", 3300, "budget", null, "Forsikring", { interval: 3 }),
    item("bilforsikring", "Bilforsikring", "udgift", 6300, "budget", null, "Bil", { interval: 6 }),
    item("braendstof", "Brændstof", "udgift", 1800, "budget", null, "Bil"),
    item("vaegtafgift", "Vægtafgift", "udgift", 1520, "budget", null, "Bil", { interval: 6 }),
    item("institution", "Vuggestue og SFO", "udgift", 4200, "budget", null, "Børn"),
    item("fritid", "Fritidsaktiviteter børn", "udgift", 450, "budget", null, "Børn"),
    item("streaming", "Streaming", "udgift", 328, "budget", null, "Abonnementer"),
    item("mad", "Mad og husholdning", "udgift", 5200, "budget", null, "Mad", { bankExcluded: true }),
    item("gaver", "Gaver", "udgift", 200, "budget", null, "Gaver", { bankExcluded: true }),

    item("billan-ydelse", "Billån", "udgift", 1600, "budget", null, "Lån", { loanId: "billan" }),
    item("forbrugslan-ydelse", "Forbrugslån", "udgift", 2100, "budget", null, "Lån", { loanId: "forbrugslan" }),
    item("forældre-ydelse", "Lån fra forældre", "udgift", 2300, "budget", null, "Lån", { loanId: "foraeldre" }),
    item("studielan-ydelse", "Studielån", "udgift", 1850, "jonas-lon", "jonas", "Lån", { loanId: "studielan" }),

    item("mobil-anna", "Mobil Anna", "udgift", 199, "anna-lon", "anna", "Abonnementer", {
      history: [{ date: ago(5), from: 229, to: 199 }],
    }),
    item("fagforening-anna", "Fagforening Anna", "udgift", 744, "anna-lon", "anna", "Fagforening og a-kasse", {
      agreementNo: "HK 551208",
    }),
    item("fitness-anna", "Fitness Anna", "udgift", 299, "anna-lon", "anna", "Fritid"),
    item("mobil-jonas", "Mobil Jonas", "udgift", 229, "jonas-lon", "jonas", "Abonnementer"),
    item("akasse-jonas", "A-kasse Jonas", "udgift", 510, "jonas-lon", "jonas", "Fagforening og a-kasse"),
    item("transport-jonas", "Rejsekort Jonas", "udgift", 600, "jonas-lon", "jonas", "Transport"),
  ];

  b.loans = [
    { id: "billan", name: "Billån", balance: 9400, ratePct: 4.9, principal: 90000, itemId: "billan-ydelse" },
    { id: "forbrugslan", name: "Forbrugslån", balance: 36500, ratePct: 8.95, principal: 60000, itemId: "forbrugslan-ydelse" },
    { id: "studielan", name: "Studielån", balance: 70000, ratePct: 4, principal: 140000, itemId: "studielan-ydelse" },
    { id: "foraeldre", name: "Lån fra forældre", balance: 160000, ratePct: 0, principal: 200000, itemId: "forældre-ydelse" },
  ];

  const nextMay = (() => {
    const y = now.getMonth() + 1 > 5 ? now.getFullYear() + 1 : now.getFullYear();
    return `${y}-05`;
  })();
  b.goals = [
    {
      id: "hus",
      name: "Udbetaling til hus",
      color: "#6CC2A2",
      mode: "target",
      target: 250000,
      deadline: addMonths(month, 33),
      monthly: 0,
      saved: 95000,
      extras: [],
      ownerId: null,
      accountId: "opsparing",
    },
    {
      id: "ferie",
      name: `Sommerferie ${nextMay.slice(0, 4)}`,
      color: "#E4B758",
      mode: "target",
      target: 22000,
      deadline: `${nextMay.slice(0, 4)}-06`,
      monthly: 0,
      saved: 8000,
      extras: [{ id: "feriepenge", month: nextMay, amount: 5000, note: "Feriepenge" }],
      ownerId: null,
      accountId: "opsparing",
    },
    {
      id: "buffer",
      name: "Buffer",
      color: "#86B8EE",
      mode: "monthly",
      target: 0,
      deadline: month,
      monthly: 1000,
      saved: 14000,
      extras: [],
      ownerId: null,
      accountId: "opsparing",
    },
  ];

  b.split = { mode: "income", fixedPct: {} };

  b.scenarios = [
    {
      id: "nyt-hus",
      name: `Nyt hus fra ${now.getFullYear() + 1}`,
      changes: [
        { kind: "removeItem", itemId: "husleje" },
        {
          kind: "addItem",
          item: item("realkredit", "Boliglån – ny realkredit", "udgift", 11200, "budget", null, "Bolig"),
        },
        {
          kind: "addItem",
          item: item("ejendomsskat", "Ejendomsskat", "udgift", 9600, "budget", null, "Bolig", { interval: 6 }),
        },
        { kind: "setAmount", itemId: "varme", amount: 1900 },
        { kind: "removeGoal", goalId: "hus" },
      ],
    },
    {
      id: "barsel",
      name: "Barsel",
      changes: [{ kind: "setAmount", itemId: "lon-anna", amount: 24500 }],
    },
  ];

  // Record the standing transfers as they are set up in the net bank today;
  // Jonas' transfer is 500 kr short so the example shows a "skal rettes" warning.
  for (const t of computeTransfers(b, month)) {
    b.registeredTransfers[t.key] = t.from === "jonas-lon" && t.to === "budget" ? t.amount - 500 : t.amount;
  }
  return b;
}
