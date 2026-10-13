import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inquiryMail, validateInquiry } from "./erhverv";
import { MAX_PER_DAY, MAX_PER_EMAIL, saveInquiry, takeInquiry } from "./erhverv-store";
import { openStore } from "./kv";

const form = { company: " Eksempel  Bank ", name: "Navn Navnesen", email: " Navn@Eksempel.dk ", phone: "", sector: "bank", count: "50", months: "12", message: "Vi vil gerne høre mere.\r\nTak." };

describe("validateInquiry", () => {
  it("accepts the form and cleans it", () => {
    expect(validateInquiry(form)).toEqual({
      ok: true,
      value: {
        company: "Eksempel Bank",
        name: "Navn Navnesen",
        email: "navn@eksempel.dk",
        phone: "",
        sector: "bank",
        pack: { count: 50, months: 12 },
        billing: "maaned",
        message: "Vi vil gerne høre mere.\nTak.",
      },
    });
  });

  it("takes a pack from the list, or none when they would rather talk", () => {
    const talk = validateInquiry({ ...form, count: "tal" });
    expect(talk.ok && talk.value.pack).toBe(null);
    const odd = validateInquiry({ ...form, count: "51" });
    expect(!odd.ok && odd.errors.pack).toBeTruthy();
    expect(validateInquiry({ ...form, sector: "skole" }).ok).toBe(false);
  });

  it("names every field that is missing or wrong", () => {
    const r = validateInquiry({ ...form, company: "", email: "nope", phone: "ring", sector: "politi", count: "", message: "x".repeat(2001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["company", "email", "message", "pack", "phone", "sector"]);
    expect(validateInquiry(null).ok).toBe(false);
  });

  it("mails the owner who asked and what they wrote", () => {
    const r = validateInquiry(form);
    if (!r.ok) throw new Error("form");
    const m = inquiryMail(r.value);
    expect(m.subject).toBe("Henvendelse fra Eksempel Bank (Bank eller pengeinstitut)");
    expect(m.text).toContain("navn@eksempel.dk");
    expect(m.text).toContain("Telefon: ikke oplyst");
    expect(m.text).toContain("Pakke: 50 koder × 12 måneder, månedlig betaling (600 kr om måneden, 7.200 kr i alt efter prislisten)");
    expect(m.text).toContain("ikke oprettet en aftale");
    const y = validateInquiry({ ...form, billing: "aar" });
    expect(y.ok && y.value.billing).toBe("aar");
  });
});

describe("inquiry store", () => {
  let dir = "";
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "erhverv-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("limits each e-mail and the day in all", async () => {
    const now = new Date("2026-10-13T10:00:00Z");
    for (let i = 0; i < MAX_PER_EMAIL; i++) expect(await takeInquiry("a@eksempel.dk", now, dir)).toBe(true);
    expect(await takeInquiry("a@eksempel.dk", now, dir)).toBe(false);
    const full = Array.from({ length: MAX_PER_DAY }, (_, i) => ({ at: now.toISOString(), email: `x${i}@eksempel.dk` }));
    await openStore(dir).set("erhverv/log.json", JSON.stringify(full));
    expect(await takeInquiry("ny@eksempel.dk", now, dir)).toBe(false);
    expect(await takeInquiry("ny@eksempel.dk", new Date("2026-10-14T10:00:01Z"), dir)).toBe(true);
  });

  it("keeps each henvendelse", async () => {
    const r = validateInquiry(form);
    if (!r.ok) throw new Error("form");
    const id = await saveInquiry(r.value, new Date("2026-10-13T10:00:00Z"), dir);
    const saved = JSON.parse((await openStore(dir).get(`erhverv/henvendelser/${id}.json`)) ?? "{}");
    expect(saved).toMatchObject({ company: "Eksempel Bank", sector: "bank", at: "2026-10-13T10:00:00.000Z" });
  });
});
