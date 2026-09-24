import type { Month } from "./types";

const nf = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 });
const MINUS = "−";

/** 64200 → "64.200 kr". Negative numbers use a real minus sign. */
export function kr(value: number, opts: { sign?: boolean } = {}): string {
  const rounded = Math.round(value);
  const body = nf.format(Math.abs(rounded));
  const sign = rounded < 0 ? MINUS : opts.sign && rounded > 0 ? "+" : "";
  return `${sign}${body} kr`;
}

export function num(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? MINUS : ""}${nf.format(Math.abs(rounded))}`;
}

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function monthOf(date: Date): Month {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonth(m: Month): { y: number; m: number } {
  const [y, mm] = m.split("-").map(Number);
  return { y: y ?? 1970, m: mm ?? 1 };
}

export function addMonths(m: Month, n: number): Month {
  const { y, m: mm } = parseMonth(m);
  const idx = y * 12 + (mm - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

/** Whole months from a to b (b − a). */
export function monthsBetween(a: Month, b: Month): number {
  const pa = parseMonth(a);
  const pb = parseMonth(b);
  return pb.y * 12 + pb.m - (pa.y * 12 + pa.m);
}

/** "2027-03" → "mar 2027". */
export function monthLabel(m: Month, capital = false): string {
  const { y, m: mm } = parseMonth(m);
  const name = MONTHS[mm - 1] ?? "";
  return `${capital ? name.charAt(0).toUpperCase() + name.slice(1) : name} ${y}`;
}

/** 19 → "1 år 7 md.", 6 → "6 md.". */
export function durationLabel(months: number): string {
  if (!Number.isFinite(months)) return "aldrig";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} md.`;
  if (m === 0) return `${y} år`;
  return `${y} år ${m} md.`;
}

export const INTERVAL_LABEL: Record<number, string> = {
  1: "hver måned",
  3: "hvert kvartal",
  6: "hvert halve år",
  12: "hvert år",
};
