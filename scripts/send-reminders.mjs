// Sends the update reminders and the reminders about tasks left open, as users have chosen under
// Indstillinger > Påmindelser (lib/reminders.ts has the rules).
// Run it once a day, e.g. from Windows Task Scheduler:  pnpm reminders --send
//
// Without --send it only prints what it would send. Each channel also needs its provider in .env.local:
//   mail: RESEND_API_KEY + REMINDER_MAIL_FROM (a sender on a domain verified at resend.com)
//   sms:  GATEWAYAPI_TOKEN (gatewayapi.com), optional REMINDER_SMS_SENDER (max 11 characters, default budgetpro)
//   REMINDER_APP_URL is the link in the message (default http://localhost:3200/app).
// Mails and texts go to the e-mail and mobile number on the user's profile (data/profiles/<user>.json, see lib/profile.ts).
// It reads data/<user>.json and keeps data/reminders.json ({ userId: { lastSent, todoSent } }); it never changes a budget.
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { readProfile } from "../lib/profile.ts";
import { channels, dueReminder, dueTodos, parseDay, reminderText, todoDaysOf, todoReminderText } from "../lib/reminders.ts";
import { openTodos } from "../lib/todos.ts";

try {
  process.loadEnvFile(".env.local");
} catch {}

const SEND = process.argv.includes("--send");
const DIR = process.env.BUDGETR_DATA_DIR || path.join(process.cwd(), "data");
const STATE = path.join(DIR, "reminders.json");
const URL_ = process.env.REMINDER_APP_URL || "http://localhost:3200/app";
const env = process.env;

const mask = (s) => (s ? s.replace(/^(.{2}).*(.{2})$/, "$1…$2") : s);

async function sendMail(to, subject, text) {
  if (!env.RESEND_API_KEY || !env.REMINDER_MAIL_FROM) throw new Error("RESEND_API_KEY / REMINDER_MAIL_FROM mangler");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.REMINDER_MAIL_FROM, to: [to], subject, text }),
  });
  if (!r.ok) throw new Error(`mail ${r.status} ${await r.text()}`);
}

async function sendSms(msisdn, message) {
  if (!env.GATEWAYAPI_TOKEN) throw new Error("GATEWAYAPI_TOKEN mangler");
  const r = await fetch("https://gatewayapi.com/rest/mtsms", {
    method: "POST",
    headers: { Authorization: `Token ${env.GATEWAYAPI_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: (env.REMINDER_SMS_SENDER || "budgetpro").slice(0, 11), message, recipients: [{ msisdn: Number(msisdn) }] }),
  });
  if (!r.ok) throw new Error(`sms ${r.status} ${await r.text()}`);
}

let state = {};
try {
  state = JSON.parse(await readFile(STATE, "utf8"));
} catch {}

const now = new Date();
let sent = 0;
for (const name of (await readdir(DIR)).filter((n) => n.endsWith(".json") && n !== "reminders.json")) {
  const user = name.slice(0, -5), file = path.join(DIR, name);
  let budget;
  try {
    budget = JSON.parse(await readFile(file, "utf8"));
  } catch {
    continue;
  }
  if (!budget || !Array.isArray(budget.entries)) continue;
  const sp = budget.settings || {};
  // Budgets saved before settings.touched existed count from the file's last save.
  const touched = parseDay(sp.touched) || (await stat(file)).mtime;
  // The last reminder is the later of the last one sent and the one last shown in the app at login.
  const last = [state[user]?.lastSent ? new Date(state[user].lastSent) : null, parseDay(sp.remindSeen)]
    .filter(Boolean)
    .sort((a, b) => b - a)[0] || null;
  // Address and number always come from the profile (lib/profile.ts); without one nothing is sent.
  const contact = await readProfile(user, DIR);
  const todos = openTodos(budget);
  const lastTodo = [state[user]?.todoSent ? new Date(state[user].todoSent) : null, parseDay(sp.todoSeen)]
    .filter(Boolean)
    .sort((a, b) => b - a)[0] || null;
  // The update reminder lists every open task, so it also counts as the task reminder.
  let due = dueReminder(sp.remind, contact, touched, last, now), t, kind = "update";
  if (due) t = reminderText(sp.title || "", touched, now, URL_, todos);
  else {
    const days = todoDaysOf(sp.remind), old = dueTodos(todos, days, lastTodo, now);
    due = old && channels(sp.remind, contact);
    if (!due) continue;
    t = todoReminderText(sp.title || "", old, todos.length, days, URL_);
    kind = "todo";
  }
  const to = [due.email && `mail ${mask(due.email)}`, due.msisdn && `sms ${mask(due.msisdn)}`].filter(Boolean).join(", ");
  if (!SEND) {
    console.log(`[prøve] ${user}: ville sende ${kind === "todo" ? "påmindelse om opgaver" : "påmindelse"} til ${to}`);
    continue;
  }
  let ok = false;
  for (const [ch, fn] of [
    ["mail", due.email && (() => sendMail(due.email, t.subject, t.text))],
    ["sms", due.msisdn && (() => sendSms(due.msisdn, t.sms))],
  ]) {
    if (!fn) continue;
    try {
      await fn();
      ok = true;
      console.log(`${user}: ${ch} sendt`);
    } catch (e) {
      console.error(`${user}: ${ch} fejlede – ${e.message}`);
    }
  }
  // Only a delivered reminder moves the clock, so a failed one is tried again at the next run.
  if (ok) {
    const at = now.toISOString();
    state[user] = kind === "todo" ? { ...state[user], todoSent: at } : { ...state[user], lastSent: at, todoSent: at };
    sent++;
  }
}
if (SEND) await writeFile(STATE, JSON.stringify(state, null, 1), "utf8");
console.log(SEND ? `${sent} påmindelse(r) sendt` : "Prøvekørsel – intet er sendt. Brug --send for at sende.");
