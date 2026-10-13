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

/** Kroner per code per month for a pack of 50 codes. */
const RATE: Record<PackMonths, number> = { 3: 17, 6: 14, 12: 12, 24: 10 };
/** Fewer codes cost a little more per code, more codes a little less. */
const SIZE: Record<PackCount, number> = { 10: 1.2, 25: 1.1, 50: 1, 100: 0.95, 200: 0.85 };

export const isPackMonths = (v: unknown): v is PackMonths => PACK_MONTHS.includes(v as PackMonths);
export const isPackCount = (v: unknown): v is PackCount => PACK_COUNTS.includes(v as PackCount);

/** The pack's price in kroner, once: rounded down to the hundred, minus 5 (50 × 12 months → 7.195 kr). */
export function packPrice(count: PackCount, months: PackMonths): number {
  const raw = count * months * RATE[months] * SIZE[count];
  return Math.max(95, Math.floor(raw / 100) * 100 - 5);
}

/** What one code costs per month in the pack, rounded to whole kroner. */
export const perCodeMonth = (count: PackCount, months: PackMonths) => Math.round(packPrice(count, months) / (count * months));

/** The private price for the same: count customers × months at 29 kr – what the pack saves the customers. */
export const privateValue = (count: number, months: number) => count * months * 29;

/** The form's default: 50 codes, 12 months. */
export const DEFAULT_PACK = { count: 50 as PackCount, months: 12 as PackMonths };

export const packLabel = (p: { count: number; months: number }) => `${p.count} koder × ${p.months} måneder`;
