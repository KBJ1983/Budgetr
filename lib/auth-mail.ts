/**
 * The confirm and login mails. Sent through Resend (same provider as scripts/send-reminders.mjs) when
 * RESEND_API_KEY and MAIL_FROM (or REMINDER_MAIL_FROM) are set in .env.local. Without them – e.g. in local
 * development – nothing is sent and the link is written to the server log instead.
 */
import type { Link, Purpose } from "./accounts";

const DEV = process.env.NODE_ENV !== "production";

/** The page a mailed link opens (it asks for a click before the link is used, so mail scanners can't spend it). */
export const linkUrl = (origin: string, l: Pick<Link, "purpose" | "token">) =>
  `${process.env.APP_URL || origin}/login/bekraeft?t=${encodeURIComponent(l.token)}${l.purpose === "verify" ? "&ny=1" : ""}`;

/**
 * Mails the link (null = nothing to send: unknown e-mail or throttled – the caller answers the same either way).
 * In development without a mail provider the link comes back as devLink so it can be opened from the page.
 */
export async function deliver(origin: string, l: Link | null): Promise<{ ok: true; devLink?: string }> {
  if (!l) return { ok: true };
  const url = linkUrl(origin, l);
  const sent = await sendAuthMail(l.account.email, authMail(l.purpose, l.account.firstName, url), url);
  return !sent && DEV ? { ok: true, devLink: url } : { ok: true };
}

export function authMail(purpose: Purpose, firstName: string, link: string) {
  if (purpose === "verify")
    return {
      subject: "Bekræft din e-mail til budgetpro",
      text: [
        `Hej ${firstName}`,
        "",
        "Tak fordi du har oprettet en konto hos budgetpro. Åbn linket herunder for at bekræfte din e-mail. Så kommer du direkte videre til dit budget.",
        "",
        link,
        "",
        "Linket virker i 48 timer og kan bruges én gang. Har du ikke oprettet en konto, kan du se bort fra denne mail.",
        "",
        "Venlig hilsen",
        "budgetpro",
      ].join("\n"),
    };
  return {
    subject: "Dit link til at logge ind på budgetpro",
    text: [
      `Hej ${firstName}`,
      "",
      "Åbn linket herunder for at logge ind på budgetpro.",
      "",
      link,
      "",
      "Linket virker i 20 minutter og kan bruges én gang. Har du ikke bedt om at logge ind, kan du se bort fra denne mail.",
      "",
      "Venlig hilsen",
      "budgetpro",
    ].join("\n"),
  };
}

/** Sends the mail. Returns false when no mail provider is set up (the link is then only in the server log). */
export async function sendAuthMail(to: string, mail: { subject: string; text: string }, link: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || process.env.REMINDER_MAIL_FROM;
  if (!key || !from) {
    // A login link is a key to the account: only print it in development.
    console.warn(`[budgetr] RESEND_API_KEY / MAIL_FROM mangler – mail til ${to} er ikke sendt.${DEV ? ` Link: ${link}` : ""}`);
    return false;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: mail.subject, text: mail.text }),
  });
  if (!r.ok) throw new Error(`mail ${r.status} ${await r.text()}`);
  return true;
}
