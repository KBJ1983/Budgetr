import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateInquiry } from "./erhverv";
import { listInquiries, markInquiry } from "./erhverv-inbox";
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
});
