/**
 * The owner's revenue calculator on /admin → Salg ("Hvad skal jeg sælge?"): play with agreements with banks and estate
 * agents (packs from lib/erhverv-packs.ts), school packs (lib/skole-packs.ts) and private customers (PRICES in
 * lib/owner.ts) and see the revenue a year – and, against a target, what is missing and what would close it.
 * Every price is incl. moms and in whole kroner; a year is counted as if packs are bought again when they run out, so
 * a business pack gives its month price × 12 a year. Pure, no server imports.
 */
import { PACK_COUNTS, PACK_MONTHS, isPackCount, isPackMonths, packMonthly, type PackCount, type PackMonths } from "./erhverv-packs";
import { PRICES } from "./owner";
import { SCHOOL_PACKS } from "./skole-packs";

export interface DealLine {
  /** Agreements (banks or estate agents). */
  deals: number;
  /** Codes per agreement. */
  count: PackCount;
  months: PackMonths;
}

export interface CalcInput {
  /** Revenue a year to aim for (0 = no target). */
  target: number;
  bank: DealLine;
  maegler: DealLine;
  schoolSmall: number;
  schoolBig: number;
  /** Private customers paying by the month, and by the year. */
  privateMonthly: number;
  privateYearly: number;
}

export const DEFAULT_CALC: CalcInput = {
  target: 500_000,
  bank: { deals: 3, count: 100, months: 12 },
  maegler: { deals: 5, count: 25, months: 12 },
  schoolSmall: 10,
  schoolBig: 5,
  privateMonthly: 300,
  privateYearly: 200,
};

export interface CalcLine {
  id: "bank" | "maegler" | "skole" | "privat";
  label: string;
  /** How it is counted, e.g. "3 aftaler × 100 koder × 1.400 kr/md". */
  detail: string;
  /** Revenue a year, whole kroner. */
  year: number;
}

export interface CalcResult {
  lines: CalcLine[];
  year: number;
  /** What is missing to the target (0 when reached or no target). */
  gap: number;
  /** What alone would close the gap, one way each. */
  toClose: { label: string; n: number }[];
}

const whole = (v: unknown, max = 1_000_000) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};
const tal = (n: number) => n.toLocaleString("da-DK");

/** What one agreement brings in a year: the pack's month price × 12. */
export const dealYear = (l: Pick<DealLine, "count" | "months">) => packMonthly(l.count, l.months) * 12;
export const PRIVATE_MONTH_YEAR = PRICES.monthly.base * 12;
export const PRIVATE_YEAR = PRICES.yearly.base;

/** Cleans what the form (or the browser's saved copy) holds. */
export function toCalcInput(x: unknown): CalcInput {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const deal = (v: unknown, d: DealLine): DealLine => {
    const l = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    const count = Number(l.count), months = Number(l.months);
    return {
      deals: l.deals === undefined ? d.deals : whole(l.deals, 10_000),
      count: isPackCount(count) ? count : d.count,
      months: isPackMonths(months) ? months : d.months,
    };
  };
  const n = (k: keyof CalcInput, max?: number) => (o[k] === undefined ? (DEFAULT_CALC[k] as number) : whole(o[k], max));
  return {
    target: n("target", 1_000_000_000),
    bank: deal(o.bank, DEFAULT_CALC.bank),
    maegler: deal(o.maegler, DEFAULT_CALC.maegler),
    schoolSmall: n("schoolSmall", 10_000),
    schoolBig: n("schoolBig", 10_000),
    privateMonthly: n("privateMonthly"),
    privateYearly: n("privateYearly"),
  };
}

export function calc(i: CalcInput): CalcResult {
  const { lille, stor } = SCHOOL_PACKS;
  const deal = (id: "bank" | "maegler", label: string, l: DealLine): CalcLine => ({
    id,
    label,
    detail: `${tal(l.deals)} ${l.deals === 1 ? "aftale" : "aftaler"} × ${tal(l.count)} koder · ${tal(packMonthly(l.count, l.months))} kr/md pr. aftale (${l.months} mdr.-pakke)`,
    year: l.deals * dealYear(l),
  });
  const lines: CalcLine[] = [
    deal("bank", "Banker", i.bank),
    deal("maegler", "Ejendomsmæglere", i.maegler),
    {
      id: "skole",
      label: "Skoler",
      detail: `${tal(i.schoolSmall)} små à ${tal(lille.price)} kr + ${tal(i.schoolBig)} store à ${tal(stor.price)} kr · ${tal(
        i.schoolSmall * lille.classes + i.schoolBig * stor.classes,
      )} klasser`,
      year: i.schoolSmall * lille.price + i.schoolBig * stor.price,
    },
    {
      id: "privat",
      label: "Privatkunder",
      detail: `${tal(i.privateMonthly)} à ${tal(PRICES.monthly.base)} kr/md + ${tal(i.privateYearly)} à ${tal(PRIVATE_YEAR)} kr/år`,
      year: i.privateMonthly * PRIVATE_MONTH_YEAR + i.privateYearly * PRIVATE_YEAR,
    },
  ];
  const year = lines.reduce((s, l) => s + l.year, 0);
  const gap = i.target > year ? i.target - year : 0;
  const need = (per: number) => (per > 0 ? Math.ceil(gap / per) : 0);
  const toClose = gap
    ? [
        { label: `bankaftaler à ${tal(i.bank.count)} koder`, n: need(dealYear(i.bank)) },
        { label: `mægleraftaler à ${tal(i.maegler.count)} koder`, n: need(dealYear(i.maegler)) },
        { label: "store skolepakker", n: need(stor.price) },
        { label: "privatkunder på månedspris", n: need(PRIVATE_MONTH_YEAR) },
      ]
    : [];
  return { lines, year, gap, toClose };
}

export { PACK_COUNTS, PACK_MONTHS };
