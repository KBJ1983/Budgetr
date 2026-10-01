/**
 * The confirm and login mails, each with a link and a 6-digit code, and the invite to a shared budget (link only). Sent through Resend (same provider as
 * scripts/send-reminders.mjs) when RESEND_API_KEY and MAIL_FROM (or REMINDER_MAIL_FROM) are set in .env.local.
 * Without them – e.g. in local development – nothing is sent and the link is written to the server log instead.
 */
import { displayName, type Link, type Purpose } from "./accounts";

const DEV = process.env.NODE_ENV !== "production";

/** The page a mailed link opens (it asks for a click before the link is used, so mail scanners can't spend it). */
export const linkUrl = (origin: string, l: Pick<Link, "purpose" | "token">) =>
  `${process.env.APP_URL || origin}/login/bekraeft?t=${encodeURIComponent(l.token)}${l.purpose === "verify" ? "&ny=1" : l.purpose === "invite" ? "&inv=1" : ""}`;

/** "123456" → "123 456", easier to read and type. */
export const spacedCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/**
 * Mails the link and code (null = nothing to send: unknown e-mail or throttled – the caller answers the same either
 * way). In development without a mail provider they come back as devLink and devCode so they can be used from the page.
 */
export async function deliver(origin: string, l: Link | null): Promise<{ ok: true; devLink?: string; devCode?: string }> {
  if (!l) return { ok: true };
  const url = linkUrl(origin, l);
  const mail =
    l.purpose === "invite"
      ? inviteMail(l.to.firstName, displayName(l.account), url, `${process.env.APP_URL || origin}/login`)
      : authMail(l.purpose, l.to.firstName, url, l.code);
  const sent = await sendAuthMail(l.to.email, mail, url);
  return !sent && DEV ? { ok: true, devLink: url, devCode: l.code } : { ok: true };
}

/**
 * Sent when the primary adds an e-mail to a shared budget. No code: nobody asked for one on a device yet. Later
 * logins go through the login page, which mails a code to the member's own e-mail.
 */
export function inviteMail(firstName: string, inviter: string, link: string, loginUrl: string) {
  return {
    subject: `${inviter} har delt et budget med dig på budgetpro`,
    text: [
      `Hej ${firstName}`,
      "",
      `${inviter} har givet dig adgang til budgettet på budgetpro, så I kan se og rette det sammen. Åbn linket for at tage imod og logge ind:`,
      "",
      link,
      "",
      `Linket virker i 7 dage og kan bruges én gang. Næste gang logger du ind på ${loginUrl} med denne e-mail. Så sender vi dig en kode.`,
      "",
      "Vi beder dig aldrig om en adgangskode eller om login til din bank. Kender du ikke afsenderen, kan du se bort fra denne mail.",
      "",
      "Venlig hilsen",
      "budgetpro",
    ].join("\n"),
  };
}

export function authMail(purpose: Exclude<Purpose, "invite">, firstName: string, link: string, code: string) {
  const c = spacedCode(code);
  if (purpose === "verify")
    return {
      subject: `${c} er din kode til budgetpro`,
      text: [
        `Hej ${firstName}`,
        "",
        "Tak fordi du har oprettet en konto hos budgetpro. Skriv koden herunder på siden, hvor du oprettede kontoen:",
        "",
        c,
        "",
        "Eller åbn linket for at bekræfte din e-mail på denne enhed:",
        "",
        link,
        "",
        "Koden og linket virker i 48 timer og kan bruges én gang. Vi beder dig aldrig om en adgangskode eller om login til din bank. Har du ikke oprettet en konto, kan du se bort fra denne mail.",
        "",
        "Venlig hilsen",
        "budgetpro",
      ].join("\n"),
    };
  return {
    subject: `${c} er din kode til at logge ind på budgetpro`,
    text: [
      `Hej ${firstName}`,
      "",
      "Skriv koden herunder på siden, hvor du bad om at logge ind:",
      "",
      c,
      "",
      "Eller åbn linket for at logge ind på denne enhed:",
      "",
      link,
      "",
      "Koden og linket virker i 20 minutter og kan bruges én gang. Vi beder dig aldrig om en adgangskode eller om login til din bank. Har du ikke bedt om at logge ind, kan du se bort fra denne mail.",
      "",
      "Venlig hilsen",
      "budgetpro",
    ].join("\n"),
  };
}

/** Sends the mail. Returns false when no mail provider is set up (the link is then only in the server log). */
export async function sendAuthMail(to: string, mail: { subject: string; text: string }, link: string): Promise<boolean> {
  // A login link is a key to the account: only print it in development.
  return sendMail(to, mail, {}, DEV ? ` Link: ${link}` : "");
}

/** Extra Resend fields: who a reply goes to, and files (content = base64). */
export interface MailExtra {
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
}

/** Sends a mail through Resend. False when no mail provider is set up (logNote is then added to the warning). */
export async function sendMail(to: string, mail: { subject: string; text: string }, extra: MailExtra = {}, logNote = ""): Promise<boolean> {
  // Trimmed (and stray quotes dropped): a pasted key often brings a space, line break or quotes along.
  const clean = (s?: string) => s?.trim().replace(/^["']|["']$/g, "").trim();
  const key = clean(process.env.RESEND_API_KEY);
  const from = clean(process.env.MAIL_FROM || process.env.REMINDER_MAIL_FROM);
  if (!key || !from) {
    console.warn(`[budgetr] RESEND_API_KEY / MAIL_FROM mangler – mail til ${to} er ikke sendt.${logNote}`);
    return false;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: mail.subject,
      text: mail.text,
      ...(extra.replyTo ? { reply_to: extra.replyTo } : {}),
      ...(extra.attachments?.length ? { attachments: extra.attachments } : {}),
    }),
  });
  if (!r.ok) throw new Error(`mail ${r.status} ${await r.text()}`);
  return true;
}
