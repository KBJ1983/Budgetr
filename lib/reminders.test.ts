import { describe, expect, it } from "vitest";
import { addMonths, dueReminder, parseDay, reminderText, toMsisdn } from "./reminders";

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
