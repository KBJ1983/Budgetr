/**
 * Open tasks (Opgaver) in a budget. The user writes a task on a budget entry or an account in the app
 * (field `todo`, e.g. "Opret den faste overførsel i banken"), and entries marked "Skal tjekkes" (`check`)
 * count too. The app shows them under the bell in the top bar (same rule as todoList() in
 * public/budgetr-app/index.html), and the update reminder lists them (lib/reminders.ts).
 *
 * Plain TypeScript with no imports, so Node can run it directly from the .mjs script.
 */

export interface Todo {
  /** The entry's description or the account's name. */
  title: string;
  /** What to do. */
  text: string;
}

interface Item {
  desc?: unknown;
  name?: unknown;
  todo?: unknown;
  check?: unknown;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export const CHECK_TEXT = "Tjek beløbet";

/** Account tasks first, then entries in their saved order. */
export function openTodos(budget: { accounts?: unknown; entries?: unknown } | null | undefined): Todo[] {
  const list = (v: unknown) => (Array.isArray(v) ? (v as Item[]).filter((x) => x && typeof x === "object") : []);
  const out: Todo[] = [];
  for (const a of list(budget?.accounts)) {
    const t = str(a.todo);
    if (t) out.push({ title: str(a.name) || "Konto", text: t });
  }
  for (const e of list(budget?.entries)) {
    const title = str(e.desc) || "Budgetpost";
    const t = str(e.todo);
    if (t) out.push({ title, text: t });
    if (e.check === true) out.push({ title, text: CHECK_TEXT });
  }
  return out;
}

/** "1 opgave" / "3 opgaver". */
export const todoCount = (n: number) => `${n} ${n === 1 ? "opgave" : "opgaver"}`;
