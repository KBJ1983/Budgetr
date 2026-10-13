import { describe, expect, it } from "vitest";
import { erhvervRoute, hasSubdomains, isErhvervHost, rootHost, siteLinks, siteOfHost } from "./site-host";

describe("site switch", () => {
  it("knows which front door a host is", () => {
    expect(siteOfHost("budgetpro.dk")).toBe("privat");
    expect(siteOfHost("erhverv.budgetpro.dk")).toBe("erhverv");
    expect(siteOfHost("Skole.budgetpro.dk")).toBe("skole");
    expect(isErhvervHost("erhvervsskolen.dk")).toBe(false);
    expect(rootHost("www.budgetpro.dk")).toBe("budgetpro.dk");
    expect(rootHost("erhverv.localhost:3200")).toBe("localhost:3200");
  });

  it("uses subdomains only where they can exist", () => {
    expect(hasSubdomains("budgetpro.dk")).toBe(true);
    expect(hasSubdomains("localhost:3200")).toBe(false);
    expect(hasSubdomains("127.0.0.1:3200")).toBe(false);
    expect(hasSubdomains("budgetr-git-main.vercel.app")).toBe(false);
  });

  it("links the three front pages on the real domain", () => {
    expect(siteLinks({ protocol: "https:", host: "budgetpro.dk" })).toEqual({
      privat: "/",
      erhverv: "https://erhverv.budgetpro.dk/",
      skole: "https://skole.budgetpro.dk/",
    });
    expect(siteLinks({ protocol: "https:", host: "erhverv.budgetpro.dk" })).toEqual({
      privat: "https://budgetpro.dk/",
      erhverv: "/",
      skole: "https://skole.budgetpro.dk/",
    });
    expect(siteLinks({ protocol: "https:", host: "www.budgetpro.dk" }).privat).toBe("https://budgetpro.dk/");
  });

  it("falls back to paths on localhost", () => {
    expect(siteLinks({ protocol: "http:", host: "localhost:3200" })).toEqual({ privat: "/", erhverv: "/erhverv", skole: "/skole" });
    expect(siteLinks({ protocol: "http:", host: "skole.localhost:3200" })).toEqual({
      privat: "http://localhost:3200/",
      erhverv: "http://localhost:3200/erhverv",
      skole: "http://localhost:3200/skole",
    });
  });

  it("routes the business subdomain", () => {
    expect(erhvervRoute("/")).toEqual({ kind: "rewrite", path: "/erhverv" });
    for (const p of ["/erhverv", "/_next/static/x.js", "/api/erhverv/kontakt", "/icon.svg", "/landing/foto-sofa.jpg"]) {
      expect(erhvervRoute(p)).toEqual({ kind: "pass" });
    }
    for (const p of ["/login", "/opret", "/aftale", "/app", "/api/budget/kbj", "/budgetr-app/index.html", "/private/kbj.legacy.json"]) {
      expect(erhvervRoute(p)).toEqual({ kind: "main" });
    }
  });
});
