import { describe, expect, it } from "vitest";
import { buildReport, bucketStart, change, cleanPath, daysBetween, previousPeriod, siteOfPage, sourceOf, type Day } from "./traffic";

describe("sourceOf", () => {
  it("names known sites and keeps the rest as a host", () => {
    expect(sourceOf("https://www.google.dk/", "", "budgetpro.dk")).toBe("Google");
    expect(sourceOf("https://gemini.google.com/app", "", "budgetpro.dk")).toBe("Gemini");
    expect(sourceOf("https://l.facebook.com/x", "", "budgetpro.dk")).toBe("Facebook");
    expect(sourceOf("https://lnkd.in/abc", "", "budgetpro.dk")).toBe("LinkedIn");
    expect(sourceOf("https://www.example.org/side", "", "budgetpro.dk")).toBe("example.org");
    expect(sourceOf("", "", "budgetpro.dk")).toBe("Direkte");
    expect(sourceOf("ikke en url", "", "budgetpro.dk")).toBe("Direkte");
  });
  it("prefers utm_source", () => {
    expect(sourceOf("https://www.google.dk/", "linkedin", "budgetpro.dk")).toBe("LinkedIn");
    expect(sourceOf("", "Forældremøde|x", "budgetpro.dk")).toBe("Forældremøde x");
  });
  it("gives no source for our own front doors", () => {
    expect(sourceOf("https://budgetpro.dk/", "", "erhverv.budgetpro.dk")).toBeNull();
    expect(sourceOf("https://skole.budgetpro.dk/elev", "", "budgetpro.dk")).toBeNull();
    expect(sourceOf("http://localhost:3200/", "", "localhost:3200")).toBeNull();
  });
});

describe("cleanPath and siteOfPage", () => {
  it("drops queries, tool pages and anything that looks like a code", () => {
    expect(cleanPath("/opret/?x=1")).toBe("/opret");
    expect(cleanPath("/")).toBe("/");
    expect(cleanPath("/Erhverv")).toBe("/erhverv");
    expect(cleanPath("/admin")).toBeNull();
    expect(cleanPath("/aftale/brug")).toBeNull();
    expect(cleanPath("/skole/klasse/abc123def")).toBeNull();
    expect(cleanPath("/klasse/demo")).toBeNull();
    expect(cleanPath("/login/bekraeft/a1b2c3d4e5")).toBe("/login/bekraeft/…");
    expect(cleanPath("https://x")).toBeNull();
    expect(cleanPath(7)).toBeNull();
  });
  it("puts /erhverv and /skole under their own door on hosts without subdomains", () => {
    expect(siteOfPage("privat", "/erhverv")).toBe("erhverv");
    expect(siteOfPage("privat", "/skole/elev")).toBe("skole");
    expect(siteOfPage("privat", "/opret")).toBe("privat");
    expect(siteOfPage("skole", "/")).toBe("skole");
  });
});

describe("periods", () => {
  it("counts days, the period before and buckets", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(daysBetween("2026-11-02", "2026-10-31")).toHaveLength(3);
    expect(daysBetween("x", "2026-10-31")).toEqual([]);
    expect(previousPeriod("2026-10-01", "2026-10-31")).toEqual({ from: "2026-08-31", to: "2026-09-30" });
    expect(bucketStart("2026-10-22", "uge")).toBe("2026-10-19");
    expect(bucketStart("2026-10-19", "uge")).toBe("2026-10-19");
    expect(bucketStart("2026-10-22", "maaned")).toBe("2026-10-01");
    expect(change(15, 10)).toBe(50);
    expect(change(3, 0)).toBeNull();
  });
});

describe("buildReport", () => {
  const days: Day[] = [
    {
      day: "2026-10-01",
      fields: {
        "v|privat": "3",
        "pv|privat": "7",
        "s|privat|Google": "2",
        "s|privat|Direkte": "1",
        "p|privat|/": "5",
        "p|privat|/opret": "2",
        "d|privat|mobil": "2",
        "d|privat|computer": "1",
        "g|privat|opret|Google": "1",
      },
    },
    {
      day: "2026-10-02",
      fields: { "v|erhverv": "1", "pv|erhverv": "2", "s|erhverv|LinkedIn": "1", "g|erhverv|henvendelse|LinkedIn": "1", "c|erhverv|banker-q4": "1" },
    },
  ];
  const prev: Day[] = [{ day: "2026-09-30", fields: { "v|privat": "1", "s|privat|Google": "1" } }];

  it("adds up a period for all doors", () => {
    const r = buildReport({ from: "2026-10-01", to: "2026-10-02" }, days, prev, "alle");
    expect(r.total).toEqual({ visitors: 4, pageviews: 9, goals: { opret: 1, demo: 0, henvendelse: 1, laerer: 0 } });
    expect(r.prevTotal.visitors).toBe(1);
    expect(r.bucket).toBe("dag");
    expect(r.series.map((s) => s.visitors)).toEqual([3, 1]);
    expect(r.sources[0]).toMatchObject({ source: "Google", visitors: 2, prevVisitors: 1, goals: { opret: 1 } });
    expect(r.sources.find((s) => s.source === "LinkedIn")?.goals.henvendelse).toBe(1);
    expect(r.pages[0]).toEqual({ site: "privat", path: "/", views: 5 });
    expect(r.campaigns).toEqual([{ name: "banker-q4", visitors: 1 }]);
    expect(r.devices).toEqual({ mobil: 2, computer: 1 });
    expect(r.sites.find((s) => s.site === "erhverv")?.visitors).toBe(1);
  });

  it("keeps to one door when asked", () => {
    const r = buildReport({ from: "2026-10-01", to: "2026-10-02" }, days, prev, "erhverv");
    expect(r.total.visitors).toBe(1);
    expect(r.sources.map((s) => s.source)).toEqual(["LinkedIn"]);
  });

  it("groups long periods by month", () => {
    const r = buildReport({ from: "2026-01-01", to: "2026-12-31" }, [], [], "alle");
    expect(r.bucket).toBe("maaned");
    expect(r.series).toHaveLength(12);
    expect(r.series[0]?.label).toBe("jan 26");
  });
});
