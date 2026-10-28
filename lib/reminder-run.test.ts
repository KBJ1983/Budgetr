import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "./kv";
import { writeProfile } from "./profile";
import { runReminders, STATE_KEY } from "./reminder-run";

const now = new Date("2026-10-28T08:00:00Z");
const budget = (settings: Record<string, unknown>) => JSON.stringify({ entries: [], accounts: [], settings });

describe("runReminders", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "budgetr-remind-"));
    const store = openStore(dir);
    // Due: every month, last change in July. Not due: changed last week. No profile: nothing to send to.
    await store.set("u-due000000000.json", budget({ title: "Vores budget", touched: "2026-07-01", remind: { every: 1, mail: true, sms: true } }));
    await store.set("u-fresh0000000.json", budget({ touched: "2026-10-21", remind: { every: 1, mail: true } }));
    await store.set("u-noprof000000.json", budget({ touched: "2026-07-01", remind: { every: 1, mail: true } }));
    await store.set("u-old000000000.json", budget({ remind: { every: 1, mail: true } }));
    await writeProfile("u-due000000000", { email: "anna@eksempel.dk", phone: "+4512345678" }, dir);
    await writeProfile("u-fresh0000000", { email: "b@eksempel.dk" }, dir);
    await writeProfile("u-old000000000", { email: "c@eksempel.dk" }, dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("finds who is due in the store; a dry run sends nothing and keeps no state", async () => {
    const r = await runReminders({ appUrl: "https://eksempel.dk/app", now, dir });
    expect(r).toEqual([{ user: "u-due000000000", kind: "update", to: { email: "anna@eksempel.dk", msisdn: "4512345678" }, sent: [], failed: [] }]);
    expect(await openStore(dir).get(STATE_KEY)).toBeNull();
  });

  it("sends by mail and SMS, notes it, and doesn't send again the same month", async () => {
    const mails: string[] = [], texts: string[] = [];
    const send = { mail: async (to: string, subject: string) => (mails.push(`${to}: ${subject}`), true), sms: async (n: string) => void texts.push(n) };
    const r = await runReminders({ appUrl: "https://eksempel.dk/app", now, dir, send });
    expect(r[0]).toMatchObject({ sent: ["mail", "sms"], failed: [] });
    expect(mails).toHaveLength(1);
    expect(mails[0]).toContain("anna@eksempel.dk");
    expect(texts).toEqual(["4512345678"]);
    expect(JSON.parse((await openStore(dir).get(STATE_KEY))!)["u-due000000000"].lastSent).toBe(now.toISOString());
    expect(await runReminders({ appUrl: "x", now: new Date("2026-11-10T08:00:00Z"), dir, send })).toEqual([]);
  });

  it("tries again next time when nothing could be delivered", async () => {
    const send = { mail: async () => false, sms: async () => { throw new Error("down"); } };
    const r = await runReminders({ appUrl: "x", now, dir, send });
    expect(r[0]).toMatchObject({ sent: [], failed: ["mail", "sms"] });
    expect(await openStore(dir).get(STATE_KEY)).toBeNull();
  });
});
