/**
 * Erhverv's price list ("model A", Oct 2026): a business buys a pack of codes once – X codes × Y months. Each code
 * gives one customer Y months of budgetpro, counted from the day the customer takes it (see lib/agreements.ts). The
 * price per code-month falls with the months and with the number of codes. The Erhverv form shows these packs; the
 * owner still makes the agreement by hand on /admin, so the price there can differ. No node: imports.
 */

export const PACK_MONTHS = [3, 6, 12, 24] as const;
export const PACK_COUNTS = [10, 25, 50, 100, 200] as const;
export type PackMonths = (typeof PACK_MONTHS)[number];
export type PackCount = (typeof PACK_COUNTS)[number];

/**
 * Whole kroner per code per month, by pack size and months. Every price is built from these by multiplying only, so
 * the month price, the year price and the total always add up to the krone – never round anything here. Packs over
 * 200 codes are not on the list: they ask through the form.
 */
const RATE: Record<PackCount, Record<PackMonths, number>> = {
  10: { 3: 20, 6: 17, 12: 15, 24: 13 },
  25: { 3: 19, 6: 16, 12: 14, 24: 12 },
  50: { 3: 17, 6: 14, 12: 12, 24: 10 },
  100: { 3: 16, 6: 13, 12: 11, 24: 9 },
  200: { 3: 15, 6: 12, 12: 10, 24: 8 },
};

/** The largest pack on the list; more codes than this go through the form. */
export const MAX_PACK_COUNT: PackCount = 200;

export const isPackMonths = (v: unknown): v is PackMonths => PACK_MONTHS.includes(v as PackMonths);
export const isPackCount = (v: unknown): v is PackCount => PACK_COUNTS.includes(v as PackCount);

/** What one code costs per month in the pack, in whole kroner. */
export const perCodeMonth = (count: PackCount, months: PackMonths) => RATE[count][months];

/** The pack spread over its months: codes × price per code-month (50 × 12 months → 600 kr a month). */
export const packMonthly = (count: PackCount, months: PackMonths) => count * perCodeMonth(count, months);

/** The pack's price in kroner, in all: the month price × months (50 × 12 months → 7.200 kr). */
export const packPrice = (count: PackCount, months: PackMonths) => packMonthly(count, months) * months;

/** What budgetpro costs a private customer a month (keep in step with components/landing/PricePlans.tsx). */
export const PRIVATE_MONTHLY = 29;

/** The private price for the same: count customers × months at 29 kr – what the pack saves the customers. */
export const privateValue = (count: number, months: number) => count * months * PRIVATE_MONTHLY;

/** The lowest price per code-month on the list and the pack that gives it – the Erhverv page's "fra 8 kr". */
export const CHEAPEST = PACK_COUNTS.flatMap((count) => PACK_MONTHS.map((months) => ({ count, months, rate: RATE[count][months] }))).reduce(
  (best, p) => (p.rate < best.rate ? p : best),
);

/** The form's default: 50 codes, 12 months. */
export const DEFAULT_PACK = { count: 50 as PackCount, months: 12 as PackMonths };

export const packLabel = (p: { count: number; months: number }) => `${p.count} koder × ${p.months} måneder`;

/** How the business would like to pay: month by month while the pack runs, or a year at a time. */
export const BILLINGS = ["maaned", "aar"] as const;
export type Billing = (typeof BILLINGS)[number];
export const isBilling = (v: unknown): v is Billing => BILLINGS.includes(v as Billing);

/** A year of the pack paid at once (the month price × 12); a pack shorter than a year is paid in full. */
export const packYearly = (count: PackCount, months: PackMonths) =>
  months >= 12 ? packMonthly(count, months) * 12 : packPrice(count, months);

export const billingLabel = (b: Billing) => (b === "aar" ? "årlig betaling" : "månedlig betaling");
