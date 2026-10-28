import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { remindAdmins } from "./agreement-reminders";
import { giveAccess } from "./agreements";
import { emptyLedger, type Org } from "./owner";
import { writeLedger } from "./owner-store";

const sent0 = new Date("2026-10-01T09:00:00Z");
const at = (d: string) => new Date(`${d}T08:00:00Z`);

// Three seats that can be sent until 31 October.
const bank: Org = { id: "o-bank", name: "Banken", category: "bank", admins: ["a@banken.dk", "b@banken.dk"], packs: [{ id: "p-1", count: 3, months: 3, bought: "2026-09-01", sendBy: "2026-10-31" }] };

describe("status mail to kundeadmins", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-adminmail-"));
    await writeLedger({ ...emptyLedger(), orgs: [bank] }, dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("tells every kundeadmin about unused seats and free seats that soon can't be sent, at most once a week", async () => {
    await giveAccess(bank, "kunde@eksempel.dk", sent0, dir);
    const mails: { to: string; text: string; subject: string }[] = [];
    const send = async (to: string, m: { subject: string; text: string }) => (mails.push({ to, ...m }), true);

    // 1 October: nothing waits long enough, and the pack ends in 30 days – that already counts.
    expect(await remindAdmins(send, "https://eksempel.dk", at("2026-10-02"), dir)).toBe(1);
    expect(mails.map((m) => m.to)).toEqual(["a@banken.dk", "b@banken.dk"]);
    expect(mails[0]!.subject).toBe("Status for Bankens aftale med budgetpro");
    expect(mails[0]!.text).toContain("2 frie pladser kan kun sendes til og med den 31.10.2026");
    expect(mails[0]!.text).not.toContain("kunde@eksempel.dk");
    expect(mails[0]!.text).toContain("https://eksempel.dk/aftale?org=o-bank");

    // Not again within the week; after it, with the seat now unused for 15 days.
    expect(await remindAdmins(send, "https://eksempel.dk", at("2026-10-05"), dir)).toBe(0);
    expect(await remindAdmins(send, "https://eksempel.dk", at("2026-10-16"), dir)).toBe(1);
    expect(mails[2]!.text).toContain("1 kode er sendt for mere end 14 dage siden");
  });

  it("says nothing when nothing waits, and tries again when no mail could go out", async () => {
    const quiet: Org = { ...bank, packs: [{ ...bank.packs![0]!, sendBy: "2027-10-31" }] };
    await writeLedger({ ...emptyLedger(), orgs: [quiet] }, dir);
    expect(await remindAdmins(async () => true, "x", at("2026-10-02"), dir)).toBe(0);
    await writeLedger({ ...emptyLedger(), orgs: [bank] }, dir);
    expect(await remindAdmins(async () => false, "x", at("2026-10-02"), dir)).toBe(0);
    expect(await remindAdmins(async () => true, "x", at("2026-10-03"), dir)).toBe(1);
  });
});
