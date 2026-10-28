/**
 * E-mails in a pasted list or an uploaded CSV/text file (/aftale, "Giv adgang til flere"). No server imports, so the
 * page counts what it found before sending, and the server reads it the same way.
 */
import { isEmail, normalizeEmail } from "./signup";

/**
 * Anything that looks like an e-mail, in order, without repeats. `invalid` holds words with an @ that aren't
 * e-mails, so the page can say what was skipped.
 */
export function parseEmails(text: unknown): { emails: string[]; invalid: string[] } {
  const words = typeof text === "string" ? text.split(/[\s,;"'<>()[\]]+/).filter((w) => w.includes("@")) : [];
  const emails: string[] = [], invalid: string[] = [];
  for (const w of words) {
    const e = normalizeEmail(w.replace(/^mailto:/i, "").replace(/[.:]+$/, ""));
    if (!isEmail(e)) invalid.push(w);
    else if (!emails.includes(e)) emails.push(e);
  }
  return { emails, invalid };
}
