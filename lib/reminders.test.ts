import { describe, expect, it } from "vitest";
import type { Todo } from "./todos";
import { addMonths, dueReminder, dueTodos, parseDay, reminderText, TODO_DAYS, todoDaysOf, todoReminderText, toMsisdn } from "./reminders";

const day = (s: string) => parseDay(s)!;

describe("dueReminder", () => {
  const r = { every: 3, mail: true, sms: true };
  const profile = { email: "navn@eksempel.dk", phone: "12 34 56 78" };

  it("is off without a period", () => {
    expect(dueReminder({ ...r, every: 0 }, profile, day("2026-01-01"), null, day("2026-09-30"))).toBeNull();
    expect(dueReminder(undefined, profile, day("2026-01-01"), null, day("2026-09-30"))).toBeNull();
  });

  it("is due `every` months after the last change, to the profile's address and number", () => {
    expect(dueReminder(r, profile, day("2026-06-30"), null, day("2026-09-29"))).toBeNull();
    expect(dueReminder(r, profile, day("2026-06-30"), null, day("2026-09-30"))).toMatchObject({ email: "navn@eksempel.dk", msisdn: "4512345678" });
  });

  it("counts from the last reminder when it is later than the change", () => {
    expect(dueReminder(r, profile, day("2026-01-01"), day("2026-08-01"), day("2026-09-30"))).toBeNull();
    expect(dueReminder(r, profile, day("2026-01-01"), day("2026-06-01"), day("2026-09-30"))).not.toBeNull();
  });

  it("leaves out channels that are off or missing on the profile", () => {
    const now = day("2026-09-30"), t = day("2026-01-01");
    expect(dueReminder({ ...r, sms: false }, profile, t, null, now)).toEqual({ due: expect.any(Date), email: "navn@eksempel.dk", msisdn: undefined });
    expect(dueReminder(r, { phone: "12345678" }, t, null, now)).toMatchObject({ email: undefined, msisdn: "4512345678" });
    expect(dueReminder(r, {}, t, null, now)).toBeNull();
    expect(dueReminder(r, { email: "ikke-en-mail", phone: "123" }, t, null, now)).toBeNull();
  });
});

describe("helpers", () => {
  it("normalises Danish mobile numbers", () => {
    expect(toMsisdn("+45 12 34 56 78")).toBe("4512345678");
    expect(toMsisdn("0045-12345678")).toBe("4512345678");
    expect(toMsisdn("1234567")).toBeNull();
  });

  it("adds months like the app", () => {
    expect(addMonths(day("2026-01-31"), 1).getMonth()).toBe(2);
  });

  it("writes calm Danish texts", () => {
    const t = reminderText("Vores budget", day("2026-06-10"), day("2026-09-30"), "http://localhost:3200/app");
    expect(t.text).toContain("Det er 3 måneder siden, du sidst rettede i budgettet Vores budget.");
    expect(t.sms.length).toBeLessThanOrEqual(160);
    expect(`${t.subject}${t.text}${t.sms}`).not.toContain("!");
  });

  it("lists open tasks and counts them in the sms", () => {
    const todos = Array.from({ length: 12 }, (_, i) => ({ title: `Post ${i + 1}`, text: "Opret i banken" }));
    const t = reminderText("", day("2026-06-10"), day("2026-09-30"), "http://localhost:3200/app", todos);
    expect(t.text).toContain("Du har 12 opgaver, der venter:\n- Post 1: Opret i banken\n");
    expect(t.text).toContain("- og 2 opgaver mere");
    expect(t.text).not.toContain("Post 11");
    expect(t.sms).toContain("Du har 12 opgaver.");
    expect(t.sms.length).toBeLessThanOrEqual(160);
    expect(reminderText("", day("2026-06-10"), day("2026-09-30"), "u").text).not.toContain("opgave");
  });
});

describe("task reminder", () => {
  const todos: Todo[] = [
    { title: "Opsparing", text: "Opret kontoen i banken", since: "2026-09-10" },
    { title: "Husleje", text: "Opret den faste overførsel i banken", since: "2026-09-25" },
    { title: "Forsikring", text: "Tjek beløbet" },
  ];

  it("is due when a task has waited the chosen number of days", () => {
    expect(dueTodos(todos, 14, null, day("2026-09-23"))).toBeNull();
    expect(dueTodos(todos, 14, null, day("2026-09-24"))).toEqual(todos.slice(0, 1));
    expect(dueTodos(todos, 0, null, day("2026-12-01"))).toBeNull();
  });

  it("waits the same number of days after the last task reminder", () => {
    expect(dueTodos(todos, 14, day("2026-09-20"), day("2026-10-03"))).toBeNull();
    expect(dueTodos(todos, 14, day("2026-09-20"), day("2026-10-04"))?.length).toBe(1);
  });

  it("defaults to 14 days and respects off", () => {
    expect(todoDaysOf(undefined)).toBe(TODO_DAYS);
    expect(todoDaysOf({ every: 3 })).toBe(14);
    expect(todoDaysOf({ todoDays: 0 })).toBe(0);
    expect(todoDaysOf({ todoDays: 30 })).toBe(30);
  });

  it("writes calm Danish texts", () => {
    const t = todoReminderText("Vores budget", todos.slice(0, 1), 3, 14, "http://localhost:3200/app");
    expect(t.subject).toBe("En opgave venter stadig");
    expect(t.text).toContain("En opgave i Vores budget har ventet i mere end 14 dage:\n- Opsparing: Opret kontoen i banken\n");
    expect(t.text).toContain("Du har også 2 opgaver mere, som er nyere.");
    expect(t.sms.length).toBeLessThanOrEqual(160);
    expect(`${t.subject}${t.text}${t.sms}`).not.toContain("!");
  });
});
