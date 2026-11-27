import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addMonthsDay, applyCrmChange, checkMail, logMail, mergeResearch, sortLeads, summarize, type Lead } from "./crm";
import { changeLead, createLead, deleteLead, getLead, importResearch, listLeads, mailLead } from "./crm-store";

// Fictional research rows in the shape of the research tool's leads.json.
const research = (over: object = {}) => ({
  id: "bank-eksempel-bank",
  seg: "bank",
  name: "Eksempel Bank",
  sub: "Lokal bank",
  place: "Hovedsæde: Eksempelby",
  kommuner: ["Eksempelby"],
  prio: "A",
  prioWhy: "Hovedsæde i området",
  metric: "3 afd. i området",
  sortValue: 1000,
  facts: [{ label: "Kunder", value: "1.000", est: true }],
  places: [{ town: "Eksempelby", addr: "Gaden 1" }],
  notes: ["En note"],
  links: ["https://eksempel.dk", "javascript:alert(1)"],
  contacts: [
    { role: "Direktør", name: "Anna Andersen", title: "Adm. direktør", phone: "11 22 33 44", email: "aa@eksempel.dk", src: "https://eksempel.dk/ledelse" },
    { name: "Bo Berg", title: "Marketingchef", email: "ikke-en-mail" },
  ],
  ...over,
});
const NOW = "2026-11-27T10:00:00.000Z";
const base = () => mergeResearch(null, research(), NOW)!;

describe("crm rules", () => {
  it("reads a research lead, dropping unsafe links and bad e-mails", () => {
    const l = base();
    expect(l).toMatchObject({ status: "ny", next: "", value: 0, source: "research", links: ["https://eksempel.dk"] });
    expect(l.contacts.map((c) => [c.name, c.title, c.email, c.source])).toEqual([
      ["Anna Andersen", "Direktør · Adm. direktør", "aa@eksempel.dk", "research"],
      ["Bo Berg", "Marketingchef", "", "research"],
    ]);
  });

  it("keeps the owner's work when the research is imported again", () => {
    let l = base();
    const anna = l.contacts[0]!;
    const bo = l.contacts[1]!;
    l = (applyCrmChange(l, { type: "contact", contact: { id: anna.id, name: "Anna Andersen", phone: "99 99 99 99", email: "anna@eksempel.dk" } }, NOW) as { lead: Lead }).lead;
    l = (applyCrmChange(l, { type: "contactDelete", contactId: bo.id }, NOW) as { lead: Lead }).lead;
    l = (applyCrmChange(l, { type: "contact", contact: { name: "Cecilie Clausen", email: "cc@eksempel.dk" } }, NOW) as { lead: Lead }).lead;
    l = (applyCrmChange(l, { type: "log", kind: "opkald", text: "Godt opkald", outcome: "moede" }, NOW) as { lead: Lead }).lead;

    const again = mergeResearch(l, research({ name: "Eksempel Bank A/S", contacts: [...research().contacts, { name: "Dorte Dahl", title: "Ny" }] }), "2026-12-01T00:00:00.000Z")!;
    expect(again.name).toBe("Eksempel Bank A/S");
    expect(again.status).toBe("moede");
    expect(again.events).toHaveLength(1);
    // Edited Anna stays as the owner left her, deleted Bo stays gone, Dorte is new, Cecilie is kept.
    expect(again.contacts.map((c) => [c.name, c.phone || c.email])).toEqual([
      ["Dorte Dahl", ""],
      ["Anna Andersen", "99 99 99 99"],
      ["Cecilie Clausen", "cc@eksempel.dk"],
    ]);
    expect(again.contacts.find((c) => c.name === "Anna Andersen")).toMatchObject({ source: "egen", src: "https://eksempel.dk/ledelse" });
  });

  it("sets status and follow-up from what a call led to", () => {
    const log = (over: object) => applyCrmChange(base(), { type: "log", kind: "opkald", text: "Talt med Anna", ...over }, NOW);
    expect(log({})).toMatchObject({ ok: true, lead: { status: "kontaktet" } });
    expect(applyCrmChange(base(), { type: "log", kind: "note", text: "Bare en note" }, NOW)).toMatchObject({ lead: { status: "ny" } });
    expect(log({ outcome: "senere", months: 3 })).toMatchObject({ lead: { status: "senere", next: "2027-02-27", events: [{ outcome: "senere", again: "2027-02-27" }] } });
    expect(log({ outcome: "senere" })).toEqual({ ok: false, error: "outcome" });
    expect(log({ outcome: "vundet" })).toMatchObject({ lead: { status: "vundet", next: "" } });
    expect(log({ outcome: "tabt", text: "Har eget værktøj" })).toMatchObject({ lead: { status: "tabt", lostWhy: "Har eget værktøj" } });
    expect(log({ outcome: "nonsense" })).toEqual({ ok: false, error: "outcome" });
    expect(log({ kind: "mail" })).toEqual({ ok: false, error: "log" });
    // An earlier day is kept at noon that day; a future day counts as now.
    expect(log({ at: "2026-11-20" })).toMatchObject({ lead: { events: [{ at: "2026-11-20T12:00:00.000Z" }] } });
    expect(log({ at: "2027-01-01" })).toMatchObject({ lead: { events: [{ at: NOW }] } });
  });

  it("adds months to a day, keeping to the end of shorter months", () => {
    expect(addMonthsDay("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsDay("2026-11-27", 12)).toBe("2027-11-27");
  });

  it("checks a mail: address, text, consent and the daily limit", () => {
    const l = base();
    const anna = l.contacts[0]!.id;
    const now = new Date(NOW);
    expect(checkMail(l, { contactId: l.contacts[1]!.id, subject: "Hej", text: "Tekst", consent: true }, now)).toEqual({ ok: false, error: "contact" });
    expect(checkMail(l, { contactId: anna, subject: "", text: "Tekst", consent: true }, now)).toEqual({ ok: false, error: "mail" });
    expect(checkMail(l, { contactId: anna, subject: "Hej", text: "Tekst" }, now)).toEqual({ ok: false, error: "consent" });
    let m = checkMail(l, { contactId: anna, subject: "Hej", text: "Tekst", consent: true, outcome: "tilbud" }, now);
    expect(m).toMatchObject({ ok: true, to: "aa@eksempel.dk" });
    if (!m.ok) throw new Error("mail");
    // An outcome only applies when the mail went out.
    expect(logMail(l, m, false, NOW)).toMatchObject({ status: "ny", events: [{ kind: "mail", sent: false }] });
    let sent = logMail(l, m, true, NOW);
    expect(sent).toMatchObject({ status: "tilbud", events: [{ kind: "mail", sent: true, outcome: "tilbud" }] });
    for (let i = 0; i < 4; i++) sent = logMail(sent, m, true, NOW);
    m = checkMail(sent, { contactId: anna, subject: "Hej", text: "Tekst", consent: true }, now);
    expect(m).toEqual({ ok: false, error: "mailLimit" });
    // A sent mail stays in the timeline.
    expect(applyCrmChange(sent, { type: "eventDelete", eventId: sent.events[0]!.id }, NOW)).toEqual({ ok: false, error: "log" });
  });

  it("sorts follow-ups that are due first, then by priority and size", () => {
    const s = (id: string, prio: "A" | "B" | "", next: string, sortValue = 0) => ({ ...summarize(base()), id, prio, next, sortValue });
    const rows = sortLeads([s("b", "B", ""), s("a2", "A", "", 5), s("a1", "A", "", 9), s("due", "", "2026-11-26"), s("later", "", "2026-12-24")], "2026-11-27");
    expect(rows.map((r) => r.id)).toEqual(["due", "a1", "a2", "b", "later"]);
  });
});

describe("crm store", () => {
  let dir = "";
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "crm-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("imports, changes, mails and deletes leads, keeping the list in step", async () => {
    expect(await importResearch({ leads: [research(), research({ id: "skole-eksempel", seg: "skole", name: "Eksempelskolen", contacts: [] }), { id: "Bad id" }] }, new Date(NOW), dir)).toEqual({
      added: 2,
      updated: 0,
      skipped: 1,
    });
    expect((await listLeads(dir)).map((l) => l.id).sort()).toEqual(["bank-eksempel-bank", "skole-eksempel"]);

    const r = await changeLead("bank-eksempel-bank", { type: "status", status: "dialog", next: "2026-12-01" }, new Date(NOW), dir);
    expect(r).toMatchObject({ ok: true, lead: { status: "dialog" } });
    expect((await listLeads(dir)).find((l) => l.id === "bank-eksempel-bank")).toMatchObject({ status: "dialog", next: "2026-12-01" });

    const anna = (await getLead("bank-eksempel-bank", dir))!.contacts[0]!.id;
    const sentTo: string[] = [];
    const m = await mailLead("bank-eksempel-bank", { contactId: anna, subject: "Hej", text: "Tekst", consent: true }, async (to) => (sentTo.push(to), true), new Date(NOW), dir);
    expect(m).toMatchObject({ ok: true, sent: true });
    expect(sentTo).toEqual(["aa@eksempel.dk"]);
    expect((await listLeads(dir)).find((l) => l.id === "bank-eksempel-bank")).toMatchObject({ lastKind: "mail" });

    // Importing again keeps status and timeline.
    expect(await importResearch({ leads: [research()] }, new Date(NOW), dir)).toMatchObject({ added: 0, updated: 1 });
    expect(await getLead("bank-eksempel-bank", dir)).toMatchObject({ status: "dialog", events: [{ kind: "mail" }] });

    const made = await createLead({ seg: "maegler", name: "Eksempel Bank", value: "25.000" }, new Date(NOW), dir);
    expect(made).toMatchObject({ ok: true, lead: { id: "egen-eksempel-bank", source: "egen", value: 25000 } });
    expect(await createLead({ seg: "maegler", name: "Eksempel Bank" }, new Date(NOW), dir)).toMatchObject({ lead: { id: "egen-eksempel-bank-2" } });
    expect(await createLead({ seg: "nope", name: "X" }, new Date(NOW), dir)).toEqual({ ok: false, error: "details" });

    expect(await deleteLead("skole-eksempel", dir)).toBe(true);
    expect(await deleteLead("skole-eksempel", dir)).toBe(false);
    expect((await listLeads(dir)).map((l) => l.id).sort()).toEqual(["bank-eksempel-bank", "egen-eksempel-bank", "egen-eksempel-bank-2"]);
  });
});
