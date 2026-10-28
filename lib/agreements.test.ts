import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_SENDS_PER_DAY,
  findGrant,
  formatCode,
  giveAccess,
  giveAccessMany,
  grantCode,
  setGrantNote,
  listGrants,
  loadPackUse,
  normalizeCode,
  sendAgain,
  useCode,
  withdrawGrant,
} from "./agreements";
import { parseEmails } from "./email-list";
import type { Org } from "./owner";

const now = new Date("2026-10-13T10:00:00Z");
const later = (ms: number) => new Date(now.getTime() + ms);
const HOUR = 60 * 60 * 1000;

const org = (packs: Org["packs"]): Org => ({ id: "o-maegler", name: "Mægleren", category: "maegler", admins: ["admin@maegler.dk"], packs });
const twoSeats = org([
  { id: "p-b", count: 5, months: 3, bought: "2026-10-01", sendBy: "2027-10-01" },
  { id: "p-a", count: 1, months: 6, bought: "2026-09-01", sendBy: "2027-09-01" },
]);

describe("agreements", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-aftaler-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("makes the same unambiguous 8-letter code from a grant every time, and reads it back however it is typed", async () => {
    const code = await grantCode("g-1", dir);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(await grantCode("g-1", dir)).toBe(code);
    expect(await grantCode("g-2", dir)).not.toBe(code);
    expect(normalizeCode(` ${formatCode(code).toLowerCase()} `)).toBe(code);
    expect(normalizeCode("ABCD-EFG")).toBeNull();
    expect(normalizeCode("ABCD-EFG0")).toBeNull();
  });

  it("gives a seat from the oldest open pack, sends the same code again for the same e-mail, and stops when the packs are full", async () => {
    const first = await giveAccess(twoSeats, " Kunde@Eksempel.dk ", now, dir);
    if (!first.ok) throw new Error(first.error);
    expect(first.grant).toMatchObject({ pack: "p-a", email: "kunde@eksempel.dk", months: 6 });
    expect(first.again).toBe(false);

    const again = await giveAccess(twoSeats, "kunde@eksempel.dk", later(HOUR), dir);
    expect(again.ok && [again.again, again.code, again.grant.id]).toEqual([true, first.code, first.grant.id]);

    const second = await giveAccess(twoSeats, "anden@eksempel.dk", now, dir);
    expect(second.ok && second.grant.pack).toBe("p-b");
    expect(await loadPackUse([twoSeats], dir)).toEqual({ "p-a": { sent: 1, used: 0 }, "p-b": { sent: 1, used: 0 } });

    const full = org([{ id: "p-x", count: 1, months: 3, bought: "2026-10-01", sendBy: "2027-10-01" }]);
    expect((await giveAccess(full, "a@eksempel.dk", now, dir)).ok).toBe(true);
    expect(await giveAccess(full, "b@eksempel.dk", now, dir)).toEqual({ ok: false, error: "full" });
    expect(await giveAccess(twoSeats, "ikke en mail", now, dir)).toEqual({ ok: false, error: "email" });
  });

  it("won't send from a pack that is past its last day or not bought yet", async () => {
    const old = org([
      { id: "p-old", count: 5, months: 3, bought: "2025-01-01", sendBy: "2026-01-01" },
      { id: "p-future", count: 5, months: 3, bought: "2026-12-01", sendBy: "2027-12-01" },
    ]);
    expect(await giveAccess(old, "a@eksempel.dk", now, dir)).toEqual({ ok: false, error: "full" });
  });

  it("sends again at most MAX_SENDS_PER_DAY times in 24 hours", async () => {
    const g = await giveAccess(twoSeats, "kunde@eksempel.dk", now, dir);
    if (!g.ok) throw new Error(g.error);
    for (let i = 1; i < MAX_SENDS_PER_DAY; i++) expect((await sendAgain(twoSeats.id, g.grant.id, later(i * HOUR), dir)).ok).toBe(true);
    expect(await sendAgain(twoSeats.id, g.grant.id, later(MAX_SENDS_PER_DAY * HOUR), dir)).toEqual({ ok: false, error: "limit" });
    expect((await sendAgain(twoSeats.id, g.grant.id, later(25 * HOUR), dir)).ok).toBe(true);
  });

  it("lets a user take the seat once; the months count from that day", async () => {
    const g = await giveAccess(twoSeats, "kunde@eksempel.dk", now, dir);
    if (!g.ok) throw new Error(g.error);
    expect(await useCode("XXXX-XXXX", "u-aaaaaaaaaaaa", now, dir)).toEqual({ ok: false, error: "unknown" });
    const taken = await useCode(formatCode(g.code), "u-aaaaaaaaaaaa", new Date("2026-11-30T12:00:00Z"), dir);
    expect(taken.ok && taken.grant).toMatchObject({ usedBy: "u-aaaaaaaaaaaa", until: "2027-05-30" });
    expect((await useCode(g.code, "u-aaaaaaaaaaaa", now, dir)).ok).toBe(true);
    expect(await useCode(g.code, "u-bbbbbbbbbbbb", now, dir)).toEqual({ ok: false, error: "used" });
    expect(await giveAccess(twoSeats, "kunde@eksempel.dk", now, dir)).toEqual({ ok: false, error: "used" });
    expect(await sendAgain(twoSeats.id, g.grant.id, now, dir)).toEqual({ ok: false, error: "used" });
    expect(await withdrawGrant(twoSeats.id, g.grant.id, dir)).toEqual({ ok: false, error: "used" });
    expect(await loadPackUse([twoSeats], dir)).toEqual({ "p-a": { sent: 1, used: 1 } });
  });

  it("won't let a seat be taken after the pack's last day", async () => {
    const g = await giveAccess(twoSeats, "kunde@eksempel.dk", now, dir);
    if (!g.ok) throw new Error(g.error);
    expect(await useCode(g.code, "u-aaaaaaaaaaaa", new Date("2027-09-02T10:00:00Z"), dir)).toEqual({ ok: false, error: "expired" });
  });

  it("withdraws an unused seat: the code stops working and the seat is free again", async () => {
    const g = await giveAccess(twoSeats, "forkert@eksempel.dk", now, dir);
    if (!g.ok) throw new Error(g.error);
    expect(await withdrawGrant(twoSeats.id, g.grant.id, dir)).toEqual({ ok: true });
    expect(await findGrant(g.code, dir)).toBeNull();
    expect(await listGrants(twoSeats.id, dir)).toEqual([]);
    const next = await giveAccess(twoSeats, "rigtig@eksempel.dk", now, dir);
    expect(next.ok && next.grant.pack).toBe("p-a");
  });

  it("never stores the code in readable form", async () => {
    const g = await giveAccess(twoSeats, "kunde@eksempel.dk", now, dir);
    if (!g.ok) throw new Error(g.error);
    const { readdir, readFile } = await import("node:fs/promises");
    const files = (await readdir(dir, { recursive: true, withFileTypes: true })).filter((f) => f.isFile());
    for (const f of files) {
      const text = await readFile(path.join(f.parentPath, f.name), "utf8");
      expect(text).not.toContain(g.code);
      expect(f.name).not.toContain(g.code);
    }
  });

  it("gives seats to a whole list, skips e-mails that already have one, and stops when the seats run out", async () => {
    await giveAccess(twoSeats, "har@eksempel.dk", now, dir);
    const list = ["ny1@eksempel.dk", "HAR@eksempel.dk", "ny1@eksempel.dk", "ikke-en-mail", "ny2@eksempel.dk", "ny3@eksempel.dk", "ny4@eksempel.dk", "ny5@eksempel.dk", "ny6@eksempel.dk"];
    const r = await giveAccessMany(twoSeats, list, now, dir, "Kampagne");
    expect(r.map((x) => [x.email, x.result])).toEqual([
      ["ny1@eksempel.dk", "sent"],
      ["har@eksempel.dk", "exists"],
      ["ikke-en-mail", "email"],
      ["ny2@eksempel.dk", "sent"],
      ["ny3@eksempel.dk", "sent"],
      ["ny4@eksempel.dk", "sent"],
      ["ny5@eksempel.dk", "sent"],
      ["ny6@eksempel.dk", "full"],
    ]);
    const grants = await listGrants(twoSeats.id, dir);
    expect(grants).toHaveLength(6);
    expect(grants.find((g) => g.email === "ny1@eksempel.dk")?.note).toBe("Kampagne");
    // The oldest pack first, as with one e-mail at a time.
    expect(grants.find((g) => g.email === "ny1@eksempel.dk")?.pack).toBe("p-b");
    expect(await findGrant(r[0]!.code, dir)).toMatchObject({ email: "ny1@eksempel.dk" });
  });

  it("keeps a note on a seat for the kundeadmins", async () => {
    const g = await giveAccess(twoSeats, "kunde@eksempel.dk", now, dir);
    if (!g.ok) throw new Error(g.error);
    expect((await setGrantNote(twoSeats.id, g.grant.id, "  Sag   1234 ", dir))?.note).toBe("Sag 1234");
    expect((await setGrantNote(twoSeats.id, g.grant.id, "", dir))?.note).toBeUndefined();
    expect(await setGrantNote(twoSeats.id, "g-ukendt", "x", dir)).toBeNull();
  });
});

describe("parseEmails", () => {
  it("finds the e-mails in a pasted list or a CSV, without repeats", () => {
    const csv = 'navn;email;telefon\n"Anna";anna@eksempel.dk;12345678\nJonas,<Jonas@Eksempel.dk>,\nmailto:anna@eksempel.dk\nfejl@\n';
    expect(parseEmails(csv)).toEqual({ emails: ["anna@eksempel.dk", "jonas@eksempel.dk"], invalid: ["fejl@"] });
    expect(parseEmails(null)).toEqual({ emails: [], invalid: [] });
  });
});
