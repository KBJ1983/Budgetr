/**
 * The Erhverv page's contact form ("Hør om en aftale"): a bank, estate agent or other business asks about an
 * agreement and picks the pack of codes it has in mind (lib/erhverv-packs.ts) – or that it would rather talk about it
 * first. The pack is only a starting point; the owner makes the agreement by hand on /admin, where the henvendelse
 * waits (lib/erhverv-inbox.ts). The rules are shared by the form (checks before sending) and the server (checks
 * again). No node: imports, so it runs in the browser too.
 */
import {
  billingLabel,
  isBilling,
  isPackCount,
  isPackMonths,
  packLabel,
  packMonthly,
  packPrice,
  packYearly,
  perCodeMonth,
  type Billing,
  type PackCount,
  type PackMonths,
} from "./erhverv-packs";
import { isEmail, normalizeEmail } from "./signup";

export const SECTORS = [
  { id: "bank", label: "Bank eller pengeinstitut" },
  { id: "maegler", label: "Ejendomsmægler" },
  { id: "andet", label: "Andet" },
] as const;

export type Sector = (typeof SECTORS)[number]["id"];

export interface Inquiry {
  company: string;
  name: string;
  email: string;
  /** Free text, may be empty. */
  phone: string;
  sector: Sector;
  /** The pack they have in mind; null when they would rather talk about it first. */
  pack: { count: PackCount; months: PackMonths } | null;
  /** How they would like to pay; the price calculator shows a month by default. */
  billing: Billing;
  message: string;
}

export type InquiryField = keyof Inquiry;

/** The form's "Antal koder" value for "we'd rather talk about it". */
export const TALK_FIRST = "tal";

export const MAX_MESSAGE = 2000;

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max + 1) : "");

/** Checks the form. Error texts are shown under each field. */
export function validateInquiry(x: unknown): { ok: true; value: Inquiry } | { ok: false; errors: Partial<Record<InquiryField, string>> } {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const company = clean(o.company, 120);
  const name = clean(o.name, 120);
  const email = normalizeEmail(o.email);
  const phone = clean(o.phone, 30);
  const sector = SECTORS.find((s) => s.id === o.sector)?.id;
  // The form sends strings; the count may be TALK_FIRST.
  const count = Number(o.count), months = Number(o.months);
  const talk = o.count === TALK_FIRST;
  const pack = !talk && isPackCount(count) && isPackMonths(months) ? { count, months } : null;
  const billing: Billing = isBilling(o.billing) ? o.billing : "maaned";
  const message = typeof o.message === "string" ? o.message.trim().replace(/\r\n?/g, "\n") : "";
  const errors: Partial<Record<InquiryField, string>> = {};
  if (!company || company.length > 120) errors.company = "Skriv navnet på virksomheden.";
  if (!name || name.length > 120) errors.name = "Skriv dit navn.";
  if (!isEmail(email)) errors.email = "Skriv en gyldig e-mail, fx navn@firma.dk.";
  if (phone.length > 30 || (phone && !/^[\d +()-]{6,30}$/.test(phone))) errors.phone = "Skriv et telefonnummer, eller lad feltet stå tomt.";
  if (!sector) errors.sector = "Vælg den branche, der passer bedst.";
  if (!talk && !pack) errors.pack = "Vælg en pakke, eller vælg at I hellere vil tale om det.";
  if (message.length > MAX_MESSAGE) errors.message = `Skriv højst ${MAX_MESSAGE} tegn.`;
  if (Object.keys(errors).length || !sector) return { ok: false, errors };
  return { ok: true, value: { company, name, email, phone, sector, pack, billing, message } };
}

const kr = (n: number) => `${n.toLocaleString("da-DK")} kr`;

export const sectorLabel = (id: string) => SECTORS.find((s) => s.id === id)?.label ?? "Andet";

/**
 * Everything they picked in the price calculator, as label/value lines – the same in the owner's mail and on /admin,
 * and the price shown the way the page showed it (a month, a year, or in all for a pack under 12 months). Takes a
 * saved henvendelse too, so a pack or billing that is no longer on the list is shown without prices.
 */
export function inquiryChoices(i: { sector: string; pack?: { count: number; months: number } | null; billing?: string }): [string, string][] {
  const lines: [string, string][] = [["Branche", sectorLabel(i.sector)]];
  const p = i.pack;
  if (!p) return [...lines, ["Pakke", "Vil tale om pakken først"]];
  lines.push(["Antal koder", `${p.count.toLocaleString("da-DK")} koder`], ["Varighed pr. kode", `${p.months} måneder`]);
  const billing = isBilling(i.billing) ? i.billing : undefined;
  if (billing) lines.push(["Betaling", billingLabel(billing, p.months)]);
  if (!isPackCount(p.count) || !isPackMonths(p.months)) return lines;
  const total = packPrice(p.count, p.months);
  if (billing === "aar") lines.push(["Pris de så", p.months < 12 ? `${kr(total)} samlet` : `${kr(packYearly(p.count, p.months))} om året`]);
  else lines.push(["Pris de så", `${kr(packMonthly(p.count, p.months))} om måneden`]);
  lines.push(["I alt efter prislisten", kr(total)], ["Pr. kunde", `${kr(perCodeMonth(p.count, p.months))} om måneden`]);
  return lines;
}

/** The mail to the owner, with every choice and what they wrote. Replies go straight to the one who asked. */
export function inquiryMail(i: Inquiry, adminUrl?: string) {
  const choices = inquiryChoices(i);
  const width = Math.max(...choices.map(([k]) => k.length)) + 2;
  return {
    subject: `Prisforespørgsel fra ${i.company} (${sectorLabel(i.sector)})${i.pack ? ` · ${packLabel(i.pack)}` : ""}`,
    text: [
      `${i.name} fra ${i.company} har sendt en prisforespørgsel fra prisberegneren.`,
      "",
      "KONTAKT",
      `Virksomhed: ${i.company}`,
      `Navn:       ${i.name}`,
      `E-mail:     ${i.email}`,
      `Telefon:    ${i.phone || "ikke oplyst"}`,
      "",
      "VALG I PRISBEREGNEREN",
      ...choices.map(([k, v]) => `${`${k}:`.padEnd(width)}${v}`),
      "",
      "DET HAR DE SKREVET",
      i.message || "Ingen besked.",
      "",
      "Det er kun en prisforespørgsel. Der er ikke oprettet en aftale.",
      `Henvendelsen venter under Henvendelser på ${adminUrl ? `${adminUrl}/admin#henvendelser` : "/admin"}. Tryk "Opret aftale" for at gøre den til en kunde med pakken udfyldt.`,
      "Svar på denne mail for at skrive direkte til dem.",
    ].join("\n"),
  };
}
