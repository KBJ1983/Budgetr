/**
 * Sends the update reminders and the reminders about tasks left open (rules in lib/reminders.ts) for every saved
 * budget in the store (lib/kv.ts: Upstash in production, ./data on disk). Used by the daily cron route
 * app/api/cron/paamindelser (Vercel) and by `pnpm reminders` (scripts/send-reminders.mjs). Mails and texts go to the
 * profile's e-mail and number (lib/profile.ts); the budget only holds the channels. What was sent is kept in
 * `reminders.json` in the store ({ userId: { lastSent, todoSent } }); a budget is never changed.
 *
 * Imports its siblings with their extension, so Node can run it from the script.
 */
import { openStore } from "./kv.ts";
import { readProfile } from "./profile.ts";
import { channels, dueReminder, dueTodos, parseDay, reminderText, todoDaysOf, todoReminderText, type RemindSettings } from "./reminders.ts";
import { openTodos } from "./todos.ts";

export const STATE_KEY = "reminders.json";

type State = Record<string, { lastSent?: string; todoSent?: string }>;

/** How a reminder goes out. `mail` may answer false when no mail provider is set up; that counts as not sent. */
export interface Senders {
  mail?: (to: string, subject: string, text: string) => Promise<boolean | void>;
  sms?: (msisdn: string, text: string) => Promise<void>;
}

export interface ReminderResult {
  user: string;
  kind: "update" | "todo";
  to: { email?: string; msisdn?: string };
  sent: ("mail" | "sms")[];
  failed: ("mail" | "sms")[];
}

const parse = (s: string | null): unknown => {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

const latest = (...d: (Date | null)[]) => d.filter((x): x is Date => !!x).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

/**
 * Works out who is due and, with `send`, sends it. Without `send` it is a dry run: the results say who would get what.
 * Only a delivered reminder moves the clock, so a failed one is tried again next time.
 */
export async function runReminders(o: { send?: Senders; appUrl: string; now?: Date; dir?: string }): Promise<ReminderResult[]> {
  const store = openStore(o.dir), now = o.now ?? new Date();
  const state = (parse(await store.get(STATE_KEY)) as State | null) ?? {};
  const out: ReminderResult[] = [];
  for (const name of (await store.list("")).filter((n) => n.endsWith(".json") && n !== STATE_KEY)) {
    const user = name.slice(0, -5);
    const budget = parse(await store.get(name)) as { entries?: unknown; settings?: Record<string, unknown> } | null;
    if (!budget || !Array.isArray(budget.entries)) continue;
    const sp = budget.settings ?? {};
    const remind = sp.remind as RemindSettings | undefined;
    // A budget without settings.touched (saved before it existed) counts from now, so it is never reminded at once.
    const touched = parseDay(sp.touched) ?? now;
    // The last reminder is the later of the last one sent and the one last shown in the app at login.
    const last = latest(state[user]?.lastSent ? new Date(state[user].lastSent!) : null, parseDay(sp.remindSeen));
    const lastTodo = latest(state[user]?.todoSent ? new Date(state[user].todoSent!) : null, parseDay(sp.todoSeen));
    const contact = await readProfile(user, o.dir);
    const todos = openTodos(budget as Parameters<typeof openTodos>[0]);
    const title = typeof sp.title === "string" ? sp.title : "";

    // The update reminder lists every open task, so it also counts as the task reminder.
    let kind: ReminderResult["kind"] = "update";
    let due: { email?: string; msisdn?: string } | null = dueReminder(remind, contact, touched, last, now);
    let text: { subject: string; text: string; sms: string };
    if (due) text = reminderText(title, touched, now, o.appUrl, todos);
    else {
      const days = todoDaysOf(remind), old = dueTodos(todos, days, lastTodo, now);
      due = old && channels(remind, contact);
      if (!old || !due) continue;
      text = todoReminderText(title, old, todos.length, days, o.appUrl);
      kind = "todo";
    }

    const r: ReminderResult = { user, kind, to: { email: due.email, msisdn: due.msisdn }, sent: [], failed: [] };
    out.push(r);
    if (!o.send) continue;
    const jobs: ["mail" | "sms", (() => Promise<boolean | void>) | undefined][] = [
      ["mail", due.email && o.send.mail ? () => o.send!.mail!(due!.email!, text.subject, text.text) : undefined],
      ["sms", due.msisdn && o.send.sms ? () => o.send!.sms!(due!.msisdn!, text.sms) : undefined],
    ];
    for (const [ch, fn] of jobs) {
      if (!fn) continue;
      try {
        if ((await fn()) === false) throw new Error("no provider");
        r.sent.push(ch);
      } catch (e) {
        r.failed.push(ch);
        console.error(`[budgetr] reminder ${ch} for ${user} failed`, e instanceof Error ? e.message : e);
      }
    }
    if (r.sent.length) {
      const at = now.toISOString();
      state[user] = kind === "todo" ? { ...state[user], todoSent: at } : { ...state[user], lastSent: at, todoSent: at };
    }
  }
  if (o.send && out.some((r) => r.sent.length)) await store.set(STATE_KEY, JSON.stringify(state, null, 1));
  return out;
}

/** Sends one text through GatewayAPI (gatewayapi.com). Needs GATEWAYAPI_TOKEN; REMINDER_SMS_SENDER is optional. */
export async function sendSms(msisdn: string, message: string): Promise<void> {
  const token = process.env.GATEWAYAPI_TOKEN?.trim();
  if (!token) throw new Error("GATEWAYAPI_TOKEN mangler");
  const r = await fetch("https://gatewayapi.com/rest/mtsms", {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: (process.env.REMINDER_SMS_SENDER || "budgetpro").slice(0, 11), message, recipients: [{ msisdn: Number(msisdn) }] }),
  });
  if (!r.ok) throw new Error(`sms ${r.status} ${await r.text()}`);
}
