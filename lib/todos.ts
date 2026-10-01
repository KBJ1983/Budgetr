/**
 * Open tasks (Opgaver) in a budget. Accounts and active fixed transfers that are not yet created in the
 * bank (`made: false`, since `madeSince`) are tasks, the user can write a task on a budget entry or an
 * account in the app (field `todo`, e.g. "Opsig aftalen"), and entries marked "Skal tjekkes" (`check`)
 * count too. The app shows them under the bell in the top bar (same rule as todoList() in
 * public/budgetr-app/index.html), the update reminder lists them, and tasks left open too long send
 * a reminder of their own (lib/reminders.ts).
 *
 * Plain TypeScript with no imports, so Node can run it directly from the .mjs script.
 */

export interface Todo {
  /** The entry's description or the account's name. */
  title: string;
  /** What to do. */
  text: string;
  /** The day the task was written (`todoSince` / `madeSince`, "2026-09-30"); Skal tjekkes has none. */
  since?: string;
}

interface Item {
  desc?: unknown;
  name?: unknown;
  type?: unknown;
  active?: unknown;
  todo?: unknown;
  todoSince?: unknown;
  made?: unknown;
  madeSince?: unknown;
  check?: unknown;
}

const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined);

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export const CHECK_TEXT = "Tjek beløbet";
export const MAKE_ACCOUNT_TEXT = "Opret kontoen i banken";
export const MAKE_TRANSFER_TEXT = "Opret den faste overførsel i banken";

/** Account tasks first, then entries in their saved order. */
export function openTodos(budget: { accounts?: unknown; entries?: unknown } | null | undefined): Todo[] {
  const list = (v: unknown) => (Array.isArray(v) ? (v as Item[]).filter((x) => x && typeof x === "object") : []);
  const out: Todo[] = [];
  for (const a of list(budget?.accounts)) {
    const title = str(a.name) || "Konto";
    if (a.made === false) out.push({ title, text: MAKE_ACCOUNT_TEXT, since: day(a.madeSince) });
    const t = str(a.todo);
    if (t) out.push({ title, text: t, since: day(a.todoSince) });
  }
  for (const e of list(budget?.entries)) {
    const title = str(e.desc) || "Budgetpost";
    if (e.type === "overfoersel" && e.active !== false && e.made === false)
      out.push({ title, text: MAKE_TRANSFER_TEXT, since: day(e.madeSince) });
    const t = str(e.todo);
    if (t) out.push({ title, text: t, since: day(e.todoSince) });
    if (e.check === true) out.push({ title, text: CHECK_TEXT });
  }
  return out;
}

/** "1 opgave" / "3 opgaver". */
export const todoCount = (n: number) => `${n} ${n === 1 ? "opgave" : "opgaver"}`;
