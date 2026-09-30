/**
 * Update reminders by e-mail or SMS. The user picks how often and which channels under Indstillinger >
 * Påmindelser in the app (saved in the budget as settings.remind); the address and number always come from
 * the user's profile (lib/profile.ts). scripts/send-reminders.mjs runs this over data/ and sends them.
 *
 * The rule (the app uses the same one for the note it shows at login): a reminder is due `every` months
 * after the later of the last change to the budget (settings.touched) and the last reminder, whether sent
 * or shown in the app at login (settings.remindSeen).
 *
 * Open tasks (lib/todos.ts) are listed in the message, so they come along with the reminder.
 *
 * Plain TypeScript, so Node can run it directly from the .mjs script.
 */

import { todoCount, type Todo } from "./todos.ts";

export interface RemindSettings {
  /** Months between reminders; 0 or missing = off. */
  every?: number;
  mail?: boolean;
  sms?: boolean;
}

/** The contact details from the profile. */
export interface Contact {
  email?: string;
  phone?: string;
}

export interface Reminder {
  due: Date;
  email?: string;
  /** MSISDN, digits only with country code, e.g. 4512345678. */
  msisdn?: string;
}

/** Adds calendar months like the app does (Date.setMonth: 31 Jan + 1 month = 3 Mar). */
export function addMonths(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + n);
  return x;
}

export const isEmail = (v: unknown) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** A Danish mobile number (8 digits, optionally with 45 / +45 / 0045) as an MSISDN, or null. */
export function toMsisdn(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^(?:(?:\+|00)?45)?(\d{8})$/.exec(v.replace(/[\s-]/g, ""));
  return m ? `45${m[1]}` : null;
}

/** "2026-09-30" → local midnight; anything else → null. */
export function parseDay(v: unknown): Date | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  const d = new Date(`${v.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The reminder for one budget if it is due at `now`, else null.
 * `touched` is the last change to the budget; `lastSent` the last reminder to this user.
 * A channel counts only when it is chosen and the profile has a valid address for it;
 * with no channel left there is nothing to send.
 */
export function dueReminder(r: RemindSettings | undefined, contact: Contact, touched: Date, lastSent: Date | null, now: Date): Reminder | null {
  const every = Math.round(Number(r?.every) || 0);
  if (!r || every <= 0) return null;
  const from = lastSent && lastSent > touched ? lastSent : touched;
  const due = addMonths(from, every);
  if (due > now) return null;
  const email = r.mail && isEmail(contact.email) ? contact.email!.trim() : undefined;
  const msisdn = (r.sms && toMsisdn(contact.phone)) || undefined;
  if (!email && !msisdn) return null;
  return { due, email, msisdn };
}

/** Whole calendar months from `a` to `b`, at least 1. */
export const monthsBetween = (a: Date, b: Date) =>
  Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());

/** Tasks listed by name in the mail; the rest are counted. */
const MAIL_TODOS = 10;

/** The texts, in the app's tone: Danish, calm, no exclamation marks. `todos` are the budget's open tasks. */
export function reminderText(title: string, touched: Date, now: Date, url: string, todos: Todo[] = []) {
  const n = monthsBetween(touched, now);
  const since = `Det er ${n === 1 ? "en måned" : `${n} måneder`} siden, du sidst rettede i budgettet`;
  const name = title.trim() || "dit budget";
  const more = todos.length - MAIL_TODOS;
  const tasks = todos.length
    ? `Du har ${todoCount(todos.length)}, der venter:\n` +
      todos.slice(0, MAIL_TODOS).map((t) => `- ${t.title}: ${t.text}\n`).join("") +
      (more > 0 ? `- og ${todoCount(more)} mere\n` : "") +
      "\n"
    : "";
  return {
    subject: "Tid til at se budgettet igennem",
    text:
      `Hej\n\n${since} ${name}. Se beløbene igennem, så de passer med det, der faktisk går ind og ud af kontiene.\n\n` +
      tasks +
      `${url}\n\nDu kan ændre eller slå påmindelsen fra under Indstillinger, Påmindelser.\n\nbudgetpro`,
    sms: `budgetpro: ${since}.${todos.length ? ` Du har ${todoCount(todos.length)}.` : ""} Se det igennem, når du har tid: ${url}`,
  };
}
