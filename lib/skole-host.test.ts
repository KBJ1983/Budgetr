import { describe, expect, it } from "vitest";
import { isSkoleHost, mainSiteUrl, pupilAddress, skoleBase, skoleRoute } from "./skole-host";

describe("school subdomain", () => {
  it("knows the school host", () => {
    expect(isSkoleHost("skole.budgetpro.dk")).toBe(true);
    expect(isSkoleHost("Skole.localhost:3200")).toBe(true);
    expect(isSkoleHost("budgetpro.dk")).toBe(false);
    expect(isSkoleHost("skolen.dk")).toBe(false);
    expect(isSkoleHost("")).toBe(false);
  });

  it("serves the school pages from the root", () => {
    expect(skoleRoute("/")).toEqual({ kind: "rewrite", path: "/skole" });
    expect(skoleRoute("/laerer")).toEqual({ kind: "rewrite", path: "/skole/laerer" });
    expect(skoleRoute("/klasse/0123456789.abcdefghijklmnopqrstuvwx")).toEqual({ kind: "rewrite", path: "/skole/klasse/0123456789.abcdefghijklmnopqrstuvwx" });
    // Not a school page: rewritten too, so it ends as the school's 404 instead of the main site's page.
    expect(skoleRoute("/app")).toEqual({ kind: "rewrite", path: "/skole/app" });
    expect(skoleRoute("/login")).toEqual({ kind: "rewrite", path: "/skole/login" });
  });

  it("lets the school's own paths and the site's files through", () => {
    for (const p of ["/skole", "/skole/laerer", "/_next/static/chunks/x.js", "/api/skole/elev", "/api/skole/klasse/abc", "/icon.svg", "/robots.txt", "/budgetr-app/vendor/jspdf.umd.min.js"]) {
      expect(skoleRoute(p)).toEqual({ kind: "pass" });
    }
  });

  it("blocks the rest of the site", () => {
    for (const p of ["/api/budget/kbj", "/api/auth/login", "/api/skole", "/private/kbj.legacy.json", "/budgetr-app/index.html"]) {
      expect(skoleRoute(p)).toEqual({ kind: "block" });
    }
  });

  it("gives the addresses as the visitor sees them", () => {
    expect(skoleBase("skole.budgetpro.dk")).toBe("");
    expect(skoleBase("localhost:3200")).toBe("/skole");
    expect(pupilAddress("skole.budgetpro.dk")).toBe("skole.budgetpro.dk");
    expect(pupilAddress("localhost:3200")).toBe("localhost:3200/skole");
    expect(mainSiteUrl({ protocol: "https:", host: "skole.budgetpro.dk" })).toBe("https://budgetpro.dk/");
    expect(mainSiteUrl({ protocol: "http:", host: "skole.localhost:3200" })).toBe("http://localhost:3200/");
    expect(mainSiteUrl({ protocol: "http:", host: "localhost:3200" })).toBe("/");
  });
});
