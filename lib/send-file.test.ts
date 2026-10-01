import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileMail, MAX_SENDS, parseSend, takeSend } from "./send-file";

const b64 = (s: string) => Buffer.from(s, "latin1").toString("base64");
const pdf = { to: " Navn@Eksempel.dk ", kind: "pdf", filename: "budgetpro-2026-10-01.pdf", content: b64("%PDF-1.3 test"), message: "" };

describe("parseSend", () => {
  it("accepts a PDF and cleans the e-mail", () => {
    const r = parseSend(pdf);
    expect(r).toEqual({ ok: true, value: { ...pdf, to: "navn@eksempel.dk" } });
  });

  it("accepts an Excel file (a zip)", () => {
    expect(parseSend({ ...pdf, kind: "xlsx", filename: "budgetpro-scenarie-2026-10-01.xlsx", content: b64("PK\x03\x04xx") }).ok).toBe(true);
  });

  it("refuses a bad e-mail, a long message and anything that isn't budgetpro's own file", () => {
    expect(parseSend({ ...pdf, to: "nope" })).toEqual({ ok: false, error: "email" });
    expect(parseSend({ ...pdf, message: "x".repeat(1001) })).toEqual({ ok: false, error: "message" });
    expect(parseSend({ ...pdf, filename: "virus.exe" })).toEqual({ ok: false, error: "file" });
    expect(parseSend({ ...pdf, filename: "budgetpro-x.xlsx" })).toEqual({ ok: false, error: "file" });
    expect(parseSend({ ...pdf, content: b64("<html>") })).toEqual({ ok: false, error: "file" });
    expect(parseSend({ ...pdf, content: "" })).toEqual({ ok: false, error: "file" });
    expect(parseSend(null)).toEqual({ ok: false, error: "email" });
  });
});

describe("takeSend", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-send-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("allows MAX_SENDS a day, then again after 24 hours", async () => {
    const t = new Date("2026-10-01T10:00:00Z");
    for (let i = 0; i < MAX_SENDS; i++) expect(await takeSend("test1", t, dir)).toBe(true);
    expect(await takeSend("test1", t, dir)).toBe(false);
    expect(await takeSend("test2", t, dir)).toBe(true);
    expect(await takeSend("test1", new Date("2026-10-02T10:00:01Z"), dir)).toBe(true);
  });
});

it("names the sender and keeps their message", () => {
  const m = fileMail("Anna Andersen", "anna@eksempel.dk", { kind: "xlsx", message: "Her er budgettet." });
  expect(m.subject).toBe("Anna Andersen har sendt dig et budget som Excel-fil fra budgetpro");
  expect(m.text).toContain("Besked fra Anna Andersen:\n\nHer er budgettet.");
  expect(fileMail("A", "a@eksempel.dk", { kind: "pdf", message: "" }).text).not.toContain("Besked fra");
});
