/**
 * budgetpro Skole's price list (Nov 2026): a school buys one pack for a school year – a small one that lets its
 * teachers make SMALL.classes classes, or a big one with BIG.classes. More classes than the big pack go through a
 * mail to budgetpro. A class counts when it is made (deleting it gives no new one), and every class made from the pack
 * lives until the pack ends. The pack's teacher seats are handed out on /aftale like any other seat
 * (lib/agreements.ts); the owner adds the pack on /admin. Prices are whole kroner incl. moms. No node: imports.
 */
import { addDays } from "./owner";

export type SchoolPackId = "lille" | "stor";

export const SCHOOL_PACKS: Record<SchoolPackId, { label: string; classes: number; price: number }> = {
  lille: { label: "Lille skolepakke", classes: 6, price: 3000 },
  stor: { label: "Stor skolepakke", classes: 12, price: 5000 },
};
export const SCHOOL_PACK_IDS = Object.keys(SCHOOL_PACKS) as SchoolPackId[];

/** Pupil codes in one class (the same as MAX_PUPILS in lib/skole.ts). */
export const PUPILS_PER_CLASS = 40;

/** A school year runs from 1 August to 31 July. */
const YEAR_START = "08-01";
/** A pack bought from this day on also covers the next school year, so a late buyer doesn't pay for a few months. */
const LATE_FROM = "04-01";

/**
 * The first day without access for a pack bought on `bought` (YYYY-MM-DD): the 1 August that ends the school year –
 * or the one after it, when the pack is bought from 1 April on.
 */
export function schoolYearEnd(bought: string): string {
  const y = Number(bought.slice(0, 4));
  const md = bought.slice(5);
  const end = md < YEAR_START ? y : y + 1;
  return `${md >= LATE_FROM && md < YEAR_START ? end + 1 : end}-${YEAR_START}`;
}

/** The last day the pack's teacher seats can be sent or taken: the day before it ends. */
export const schoolPackSendBy = (until: string) => addDays(until, -1);
