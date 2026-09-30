/**
 * The signup form's rules, shared by the form (checks before sending) and the server (lib/accounts.ts,
 * checks again). No node: imports, so it runs in the browser too.
 */
import { toMsisdn } from "./reminders";

export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  /** "+45" and 8 digits. */
  phone: string;
}

export type SignupField = keyof SignupInput;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;
export const normalizeEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");
export const isEmail = (v: string) => v.length <= 200 && EMAIL_PATTERN.test(v);

const cleanName = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

/** Checks the signup form. Error texts are shown under each field. */
export function validateSignup(x: unknown):
  | { ok: true; value: SignupInput }
  | { ok: false; errors: Partial<Record<SignupField, string>> } {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const firstName = cleanName(o.firstName);
  const lastName = cleanName(o.lastName);
  const email = normalizeEmail(o.email);
  const msisdn = toMsisdn(o.phone);
  const errors: Partial<Record<SignupField, string>> = {};
  if (!firstName || firstName.length > 60) errors.firstName = "Skriv dit fornavn.";
  if (!lastName || lastName.length > 60) errors.lastName = "Skriv dit efternavn.";
  if (!isEmail(email)) errors.email = "Skriv en gyldig e-mail, fx navn@eksempel.dk.";
  if (!msisdn) errors.phone = "Skriv et dansk mobilnummer med 8 cifre.";
  if (Object.keys(errors).length || !msisdn) return { ok: false, errors };
  return { ok: true, value: { firstName, lastName, email, phone: `+${msisdn}` } };
}
