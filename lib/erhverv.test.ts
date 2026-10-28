import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { inquiryChoices, inquiryMail, validateInquiry } from "./erhverv";
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
        billing: "samlet",
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
    const m = inquiryMail(r.value, "https://eksempel.dk");
    expect(m.subject).toBe("Prisforespørgsel fra Eksempel Bank (Bank eller pengeinstitut) · 50 koder × 12 måneder");
    expect(m.text).toContain("navn@eksempel.dk");
    expect(m.text).toContain("Telefon:    ikke oplyst");
    for (const line of ["Antal koder", "50 koder", "12 måneder", "samlet for hele pakken", "7.200 kr samlet inkl. moms", "12 kr om måneden"])
      expect(m.text).toContain(line);
    expect(m.text).toContain("Vi vil gerne høre mere.\nTak.");
    expect(m.text).toContain("https://eksempel.dk/admin#henvendelser");
    expect(m.text).toContain("ikke oprettet en aftale");
    const y = validateInquiry({ ...form, billing: "aar" });
    expect(y.ok && y.value.billing).toBe("aar");
  });

  it("lists the choices the way the price calculator showed them", () => {
    const get = (x: Parameters<typeof inquiryChoices>[0]) => Object.fromEntries(inquiryChoices(x));
    expect(get({ sector: "bank", pack: { count: 50, months: 24 }, billing: "aar" })).toMatchObject({
      Betaling: "årlig betaling",
      "Pris de så": "6.000 kr om året inkl. moms",
      "I alt efter prislisten": "12.000 kr inkl. moms",
    });
    expect(get({ sector: "maegler", pack: { count: 10, months: 3 }, billing: "aar" })).toMatchObject({
      Branche: "Ejendomsmægler",
      Betaling: "samlet for hele pakken",
      "Pris de så": "600 kr samlet inkl. moms",
    });
    expect(get({ sector: "bank", pack: { count: 50, months: 12 }, billing: "maaned" })).toMatchObject({
      Betaling: "månedlig betaling",
      "Pris de så": "600 kr om måneden inkl. moms",
    });
    expect(get({ sector: "andet", pack: null })).toEqual({ Branche: "Andet", Pakke: "Vil tale om pakken først" });
    // An old henvendelse with a pack that's no longer on the list: no prices.
    expect(get({ sector: "bank", pack: { count: 30, months: 12 } })["Pris de så"]).toBeUndefined();
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
