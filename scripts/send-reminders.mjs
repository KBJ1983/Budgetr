// Sends the update reminders and the reminders about tasks left open, as users have chosen under
// Indstillinger > Påmindelser. The work is done by lib/reminder-run.ts, the same code as the daily cron route
// /api/cron/paamindelser on Vercel; this script runs it by hand:  pnpm reminders --send
//
// Without --send it only prints what it would send. It reads the same store as the site (lib/kv.ts): Upstash when
// KV_REST_API_URL + KV_REST_API_TOKEN are in .env.local, else ./data (or BUDGETR_DATA_DIR). Each channel needs its provider:
//   mail: RESEND_API_KEY + REMINDER_MAIL_FROM (or MAIL_FROM), a sender on a domain verified at resend.com
//   sms:  GATEWAYAPI_TOKEN (gatewayapi.com), optional REMINDER_SMS_SENDER (max 11 characters, default budgetpro)
//   REMINDER_APP_URL is the link in the message (default http://localhost:3200/app).
import { mailHtml } from "../lib/mail-html.ts";
import { runReminders, sendSms } from "../lib/reminder-run.ts";

try {
  process.loadEnvFile(".env.local");
} catch {}

const SEND = process.argv.includes("--send");
const URL_ = process.env.REMINDER_APP_URL || "http://localhost:3200/app";
const env = process.env;

const mask = (s) => (s ? s.replace(/^(.{2}).*(.{2})$/, "$1…$2") : s);

async function sendMail(to, subject, text) {
  const from = env.REMINDER_MAIL_FROM || env.MAIL_FROM;
  if (!env.RESEND_API_KEY || !from) throw new Error("RESEND_API_KEY / REMINDER_MAIL_FROM mangler");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    // The same branded HTML as the site's mails (lib/mail-html.ts); the logo and the button go by the link's site.
    body: JSON.stringify({ from, to: [to], subject, text, html: mailHtml({ subject, text }, { siteUrl: URL_ }) }),
  });
  if (!r.ok) throw new Error(`mail ${r.status} ${await r.text()}`);
}

const results = await runReminders({ appUrl: URL_, send: SEND ? { mail: sendMail, sms: sendSms } : undefined });
for (const r of results) {
  const to = [r.to.email && `mail ${mask(r.to.email)}`, r.to.msisdn && `sms ${mask(r.to.msisdn)}`].filter(Boolean).join(", ");
  const what = r.kind === "todo" ? "påmindelse om opgaver" : "påmindelse";
  if (!SEND) console.log(`[prøve] ${r.user}: ville sende ${what} til ${to}`);
  else console.log(`${r.user}: ${what} – sendt: ${r.sent.join(", ") || "intet"}${r.failed.length ? `, fejlede: ${r.failed.join(", ")}` : ""}`);
}
const sent = results.filter((r) => r.sent.length).length;
console.log(SEND ? `${sent} påmindelse(r) sendt` : "Prøvekørsel – intet er sendt. Brug --send for at sende.");
