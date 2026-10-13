import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_ADMIN_CODE_TRIES,
  addColleague,
  adminId,
  adminWithOrgs,
  loadAgreementView,
  redeemAdminCode,
  redeemAdminLink,
  removeColleague,
  requestAdminLogin,
} from "./agreement-admins";
import { giveAccess, useCode } from "./agreements";
import { emptyLedger, type Ledger, type Org } from "./owner";
import { readLedger, writeLedger } from "./owner-store";

const now = new Date("2026-10-13T10:00:00Z");
const later = (ms: number) => new Date(now.getTime() + ms);
const MIN = 60 * 1000;

const bank: Org = {
  id: "o-bank",
  name: "Banken",
  category: "bank",
  admins: ["anna@banken.dk", "bo@banken.dk"],
  packs: [{ id: "p-1", count: 3, months: 12, bought: "2026-10-01", sendBy: "2027-10-01", price: 9000 }],
};
const school: Org = { id: "o-skole", name: "Skolen", category: "skole", admins: ["anna@banken.dk"] };

describe("kundeadmins", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-kundeadmin-"));
    const ledger: Ledger = { ...emptyLedger(), orgs: [bank, school] };
    await writeLedger(ledger, dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("only mails a login to an e-mail that runs an agreement, and not twice within a minute", async () => {
    expect(await requestAdminLogin("ukendt@eksempel.dk", now, dir)).toBeNull();
    const m = await requestAdminLogin(" Anna@Banken.dk ", now, dir);
    expect(m?.admin).toMatchObject({ id: adminId("anna@banken.dk"), email: "anna@banken.dk" });
    expect(m?.code).toMatch(/^\d{6}$/);
    expect(await requestAdminLogin("anna@banken.dk", later(30_000), dir)).toBeNull();
    expect(await requestAdminLogin("anna@banken.dk", later(2 * MIN), dir)).not.toBeNull();
  });

  it("logs in once with the link or the code, and stops after too many wrong codes", async () => {
    const m = (await requestAdminLogin("anna@banken.dk", now, dir))!;
    const a = await redeemAdminLink(m.token, later(MIN), dir);
    expect(a?.verifiedAt).toBeTruthy();
    expect(await redeemAdminLink(m.token, later(MIN), dir)).toBeNull();

    const m2 = (await requestAdminLogin("bo@banken.dk", now, dir))!;
    const wrong = m2.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < MAX_ADMIN_CODE_TRIES; i++) expect(await redeemAdminCode("bo@banken.dk", wrong, later(MIN), dir)).toBeNull();
    expect(await redeemAdminCode("bo@banken.dk", m2.code, later(MIN), dir)).toBeNull();

    const m3 = (await requestAdminLogin("bo@banken.dk", later(2 * MIN), dir))!;
    expect(await redeemAdminCode("bo@banken.dk", `${m3.code.slice(0, 3)} ${m3.code.slice(3)}`, later(3 * MIN), dir)).not.toBeNull();
    expect(await redeemAdminCode("bo@banken.dk", m3.code, later(3 * MIN), dir)).toBeNull();
    expect(await redeemAdminCode("bo@banken.dk", (await requestAdminLogin("bo@banken.dk", later(5 * MIN), dir))!.code, later(30 * MIN), dir)).toBeNull();
  });

  it("gives access to every agreement the e-mail runs, and none once the e-mail is taken off", async () => {
    const m = (await requestAdminLogin("anna@banken.dk", now, dir))!;
    await redeemAdminLink(m.token, now, dir);
    expect((await adminWithOrgs(m.admin.id, dir))?.orgs.map((o) => o.id)).toEqual(["o-bank", "o-skole"]);
    expect(await adminWithOrgs(adminId("ukendt@eksempel.dk"), dir)).toBeNull();

    const ledger = await readLedger(dir);
    for (const o of ledger.orgs) o.admins = o.admins!.filter((e) => e !== "anna@banken.dk");
    await writeLedger(ledger, dir);
    expect(await adminWithOrgs(m.admin.id, dir)).toBeNull();
  });

  it("lets a kundeadmin add and remove colleagues, but not themselves, and at most five", async () => {
    expect(await addColleague("o-bank", "anna@banken.dk", "ikke en mail", dir)).toEqual({ ok: false, error: "email" });
    expect(await addColleague("o-bank", "bo@banken.dk", "bo@banken.dk", dir)).toEqual({ ok: false, error: "exists" });
    expect(await addColleague("o-skole", "bo@banken.dk", "c@banken.dk", dir)).toEqual({ ok: false, error: "org" });
    const r = await addColleague("o-bank", "anna@banken.dk", " C@Banken.dk ", dir);
    expect(r.ok && r.added).toBe("c@banken.dk");
    await addColleague("o-bank", "anna@banken.dk", "d@banken.dk", dir);
    await addColleague("o-bank", "anna@banken.dk", "e@banken.dk", dir);
    expect(await addColleague("o-bank", "anna@banken.dk", "f@banken.dk", dir)).toEqual({ ok: false, error: "max" });
    expect(await removeColleague("o-bank", "anna@banken.dk", "anna@banken.dk", dir)).toEqual({ ok: false, error: "self" });
    expect((await removeColleague("o-bank", "anna@banken.dk", "bo@banken.dk", dir)).ok).toBe(true);
    expect((await readLedger(dir)).orgs[0]!.admins).toEqual(["anna@banken.dk", "c@banken.dk", "d@banken.dk", "e@banken.dk"]);
  });

  it("shows seats and e-mails with their status – never a code or a price", async () => {
    const sent = await giveAccess(bank, "kunde1@eksempel.dk", now, dir);
    const used = await giveAccess(bank, "kunde2@eksempel.dk", later(MIN), dir);
    if (!sent.ok || !used.ok) throw new Error("not sent");
    await useCode(used.code, "u-aaaaaaaaaaaa", later(2 * MIN), dir);
    const v = await loadAgreementView(bank, "Anna@banken.dk", later(3 * MIN), dir);
    expect(v).toMatchObject({ me: "anna@banken.dk", seats: { count: 3, sent: 2, used: 1, free: 1 } });
    expect(v.grants.map((g) => [g.email, g.status, g.open])).toEqual([
      ["kunde2@eksempel.dk", "active", false],
      ["kunde1@eksempel.dk", "sent", true],
    ]);
    expect(v.grants[0]!.until).toBe("2027-10-13");
    const text = JSON.stringify(v);
    expect(text).not.toContain(sent.code);
    expect(text).not.toContain(used.code);
    expect(text).not.toContain("9000");
  });
});
