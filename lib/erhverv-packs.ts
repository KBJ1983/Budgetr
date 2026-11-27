/**
 * Erhverv's price list ("model A", Oct 2026; rates raised Nov 2026 so a code never costs less than 12 kr a month): a business buys a pack of codes once – X codes × Y months. Each code
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
  10: { 3: 22, 6: 20, 12: 18, 24: 16 },
  25: { 3: 20, 6: 18, 12: 16, 24: 15 },
  50: { 3: 18, 6: 16, 12: 15, 24: 14 },
  100: { 3: 17, 6: 15, 12: 14, 24: 13 },
  200: { 3: 16, 6: 14, 12: 13, 24: 12 },
};

/** The lowest price per code-month on the list (200 codes × 24 months). */
export const MIN_CODE_MONTH = 12;

/** The largest pack on the list; more codes than this go through the form. */
export const MAX_PACK_COUNT: PackCount = 200;

export const isPackMonths = (v: unknown): v is PackMonths => PACK_MONTHS.includes(v as PackMonths);
export const isPackCount = (v: unknown): v is PackCount => PACK_COUNTS.includes(v as PackCount);

/** What one code costs per month in the pack, in whole kroner. */
export const perCodeMonth = (count: PackCount, months: PackMonths) => RATE[count][months];

/** The pack spread over its months: codes × price per code-month (50 × 12 months → 750 kr a month). */
export const packMonthly = (count: PackCount, months: PackMonths) => count * perCodeMonth(count, months);

/** The pack's price in kroner, in all: the month price × months (50 × 12 months → 9.000 kr). */
export const packPrice = (count: PackCount, months: PackMonths) => packMonthly(count, months) * months;

/** What budgetpro costs a private customer a month (keep in step with components/landing/PricePlans.tsx). */
export const PRIVATE_MONTHLY = 29;

/** The private price for the same: count customers × months at 29 kr – what the pack saves the customers. */
export const privateValue = (count: number, months: number) => count * months * PRIVATE_MONTHLY;

/** The form's default: 50 codes, 12 months. */
export const DEFAULT_PACK = { count: 50 as PackCount, months: 12 as PackMonths };

export const packLabel = (p: { count: number; months: number }) => `${p.count} koder × ${p.months} måneder`;

/**
 * How the price was shown and how the business would like to pay: the whole pack at once (the form's default), month by
 * month while the pack runs, or a year at a time (offered for packs over 12 months; "aar" on a shorter pack is from
 * before "samlet" and means the same). All prices are incl. moms.
 */
export const BILLINGS = ["samlet", "maaned", "aar"] as const;
export type Billing = (typeof BILLINGS)[number];
export const isBilling = (v: unknown): v is Billing => BILLINGS.includes(v as Billing);

/** A year of the pack paid at once (the month price × 12); a pack shorter than a year is paid in full. */
export const packYearly = (count: PackCount, months: PackMonths) =>
  months >= 12 ? packMonthly(count, months) * 12 : packPrice(count, months);

/** How they want to pay, as the form put it. */
export const billingLabel = (b: Billing, months = 12) =>
  b === "samlet" || (b === "aar" && months < 12) ? "samlet for hele pakken" : b === "aar" ? "årlig betaling" : "månedlig betaling";
