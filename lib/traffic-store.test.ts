import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "./kv";
import { loadLive, noteGoal, notePageView } from "./traffic-store";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "budgetr-traffic-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const browser = (ip: string, host = "budgetpro.dk", extra: Record<string, string> = {}) => {
  const h: Record<string, string> = { "x-forwarded-for": ip, "user-agent": "Mozilla/5.0 (iPhone) Safari", host, ...extra };
  return { get: (n: string) => h[n.toLowerCase()] ?? null };
};
const day = new Date("2026-10-20T10:00:00Z");
const counts = () => openStore(dir).fields("stats/dag/2026-10-20.json");

describe("traffic store", () => {
  it("counts visitors once a day per door, with the first source", async () => {
    await notePageView({ path: "/", ref: "https://www.google.com/" }, browser("1.1.1.1"), day, dir);
    await notePageView({ path: "/opret", ref: "" }, browser("1.1.1.1"), day, dir);
    await notePageView({ path: "/", ref: "https://budgetpro.dk/" }, browser("1.1.1.1", "erhverv.budgetpro.dk"), day, dir);
    await notePageView({ path: "/", ref: "" }, browser("2.2.2.2"), day, dir);
    expect(await counts()).toMatchObject({
      "v|privat": "2",
      "pv|privat": "3",
      "s|privat|Google": "1",
      "s|privat|Direkte": "1",
      "v|erhverv": "1",
      "s|erhverv|Google": "1",
      "p|privat|/opret": "1",
      "d|privat|mobil": "2",
    });
  });

  it("skips bots, tool pages and browsers that opt out", async () => {
    const bot = { get: (n: string) => (n === "user-agent" ? "Googlebot/2.1" : null) };
    expect(await notePageView({ path: "/" }, bot, day, dir)).toBe(false);
    expect(await notePageView({ path: "/admin" }, browser("1.1.1.1"), day, dir)).toBe(false);
    expect(await notePageView({ path: "/" }, browser("1.1.1.1", "budgetpro.dk", { "sec-gpc": "1" }), day, dir)).toBe(false);
    expect(await counts()).toEqual({});
  });

  it("ties a form to the visit's source, also the day after", async () => {
    await notePageView({ path: "/erhverv", utmSource: "linkedin", utmCampaign: "q4" }, browser("3.3.3.3", "localhost:3200"), day, dir);
    const next = new Date("2026-10-21T08:00:00Z");
    expect(await noteGoal("henvendelse", browser("3.3.3.3", "localhost:3200"), next, dir)).toBe("LinkedIn");
    expect(await noteGoal("opret", browser("9.9.9.9"), next, dir)).toBe("Ukendt");
    expect(await openStore(dir).fields("stats/dag/2026-10-21.json")).toEqual({
      "g|erhverv|henvendelse|LinkedIn": "1",
      "g|privat|opret|Ukendt": "1",
    });
    expect((await counts())["c|erhverv|q4"]).toBe("1");
  });

  it("counts places and shows who is on the sites right now", async () => {
    const geo = { "x-vercel-ip-country": "DK", "x-vercel-ip-city": "%C3%85rhus", "x-vercel-ip-latitude": "56.1572", "x-vercel-ip-longitude": "10.2107" };
    await notePageView({ path: "/" }, browser("1.1.1.1", "budgetpro.dk", geo), day, dir);
    await notePageView({ path: "/opret" }, browser("1.1.1.1", "budgetpro.dk", geo), new Date(day.getTime() + 60_000), dir);
    await notePageView({ path: "/erhverv" }, browser("2.2.2.2"), day, dir);
    expect((await counts())["l|privat|DK|Århus"]).toBe("1");
    expect(await openStore(dir).fields("stats/steder.json")).toEqual({ "DK|Århus": "56.2,10.2" });

    const live = await loadLive(new Date(day.getTime() + 2 * 60_000), dir);
    expect(live.visitors).toBe(2);
    expect(live.sites).toEqual({ privat: 1, erhverv: 1, skole: 0 });
    expect(live.places).toContainEqual({ country: "DK", city: "Århus", visitors: 1, lat: 56.2, lon: 10.2 });
    expect(live.pages).toContainEqual({ site: "privat", path: "/opret", visitors: 1 });
    expect((await loadLive(new Date(day.getTime() + 20 * 60_000), dir)).visitors).toBe(0);
  });

  it("forgets visitor hashes after two days", async () => {
    await notePageView({ path: "/" }, browser("1.1.1.1"), day, dir);
    await notePageView({ path: "/" }, browser("1.1.1.1"), new Date("2026-10-23T10:00:00Z"), dir);
    expect((await openStore(dir).list("stats/besoeg")).sort()).toEqual(["2026-10-23.json"]);
  });
});
