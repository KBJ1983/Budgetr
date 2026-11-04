import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateInquiry } from "./erhverv";
import { MAX_REPLIES_PER_DAY, deleteInquiry, listInquiries, markInquiry, replyToInquiry } from "./erhverv-inbox";
import { saveInquiry } from "./erhverv-store";

const form = { company: "Eksempel Bank", name: "Navn Navnesen", email: "navn@eksempel.dk", phone: "", sector: "bank", count: "50", months: "12", message: "" };

describe("inquiry inbox", () => {
  let dir = "";
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "erhverv-inbox-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lists henvendelser newest first, waiting until marked done", async () => {
    const r = validateInquiry(form);
    if (!r.ok) throw new Error("form");
    const first = await saveInquiry(r.value, new Date("2026-10-13T09:00:00Z"), dir);
    const second = await saveInquiry({ ...r.value, company: "Mægler", pack: null }, new Date("2026-10-13T10:00:00Z"), dir);

    let rows = await listInquiries(dir);
    expect(rows.map((x) => x.id)).toEqual([second, first]);
    expect(rows[1]).toMatchObject({ pack: { count: 50, months: 12 }, doneAt: undefined });
    expect(rows[0]?.pack).toBeUndefined();

    expect(await markInquiry(first, true, "o-1", new Date("2026-10-14T08:00:00Z"), dir)).toBe(true);
    rows = await listInquiries(dir);
    expect(rows[1]).toMatchObject({ doneAt: "2026-10-14T08:00:00.000Z", org: "o-1" });

    expect(await markInquiry(first, false, undefined, new Date(), dir)).toBe(true);
    expect((await listInquiries(dir))[1]?.doneAt).toBeUndefined();
    expect(await markInquiry("findes-ikke", true, undefined, new Date(), dir)).toBe(false);
    expect(await markInquiry("../accounts/x", true, undefined, new Date(), dir)).toBe(false);
  });

  it("answers a henvendelse by mail and keeps the answer on it", async () => {
    const r = validateInquiry({ ...form, message: "Kan vi starte i december?" });
    if (!r.ok) throw new Error("form");
    const id = await saveInquiry(r.value, new Date("2026-10-13T09:00:00Z"), dir);
    const mails: { to: string; subject: string; text: string }[] = [];
    const mail = async (to: string, subject: string, text: string) => (mails.push({ to, subject, text }), true);

    const at = new Date("2026-10-14T08:00:00Z");
    expect(await replyToInquiry(id, { subject: " Sv: Prisforespørgsel\n", text: "Hej Navn\r\n\r\nJa." }, mail, at, dir)).toEqual({ ok: true, sent: true });
    expect(mails).toEqual([{ to: "navn@eksempel.dk", subject: "Sv: Prisforespørgsel", text: "Hej Navn\n\nJa." }]);
    expect((await listInquiries(dir))[0]?.replies).toEqual([{ at: at.toISOString(), subject: "Sv: Prisforespørgsel", text: "Hej Navn\n\nJa.", sent: true }]);

    // Without a mail provider the answer is still kept, marked as not sent.
    expect(await replyToInquiry(id, { subject: "Sv", text: "Igen" }, async () => false, at, dir)).toEqual({ ok: true, sent: false });
    expect((await listInquiries(dir))[0]?.replies.at(-1)).toMatchObject({ text: "Igen", sent: false });

    expect(await replyToInquiry(id, { subject: "", text: "x" }, mail, at, dir)).toEqual({ ok: false, error: "reply" });
    expect(await replyToInquiry(id, { subject: "x", text: "  " }, mail, at, dir)).toEqual({ ok: false, error: "reply" });
    expect(await replyToInquiry("findes-ikke", { subject: "x", text: "y" }, mail, at, dir)).toEqual({ ok: false, error: "inquiry" });
  });

  it("answers at most MAX_REPLIES_PER_DAY times a day per henvendelse", async () => {
    const r = validateInquiry(form);
    if (!r.ok) throw new Error("form");
    const id = await saveInquiry(r.value, new Date("2026-10-13T09:00:00Z"), dir);
    let sent = 0;
    const mail = async () => (sent++, true);
    const t0 = Date.parse("2026-10-14T08:00:00Z");
    for (let i = 0; i < MAX_REPLIES_PER_DAY; i++) {
      expect((await replyToInquiry(id, { subject: "Sv", text: `${i}` }, mail, new Date(t0 + i * 60_000), dir)).ok).toBe(true);
    }
    expect(await replyToInquiry(id, { subject: "Sv", text: "for mange" }, mail, new Date(t0 + 3600_000), dir)).toEqual({ ok: false, error: "replyLimit" });
    expect(sent).toBe(MAX_REPLIES_PER_DAY);
    // A day after the first ones, it can be answered again.
    expect((await replyToInquiry(id, { subject: "Sv", text: "næste dag" }, mail, new Date(t0 + 25 * 3600_000), dir)).ok).toBe(true);
  });

  it("deletes a henvendelse for good", async () => {
    const r = validateInquiry(form);
    if (!r.ok) throw new Error("form");
    const id = await saveInquiry(r.value, new Date("2026-10-13T09:00:00Z"), dir);
    expect(await deleteInquiry(id, dir)).toBe(true);
    expect(await listInquiries(dir)).toEqual([]);
    expect(await deleteInquiry(id, dir)).toBe(false);
    expect(await deleteInquiry("../accounts/x", dir)).toBe(false);
  });
});
