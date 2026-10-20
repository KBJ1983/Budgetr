/**
 * The three front doors: Privat (budgetpro.dk), Erhverv (erhverv.budgetpro.dk) and Skole (skole.budgetpro.dk). The
 * switch at the top of each front page links between them. Where a host can't have subdomains (localhost, an IP,
 * Vercel's preview hosts) the doors are paths on the main site instead: "/erhverv" and "/skole".
 * Pure functions: proxy.ts, the pages and the browser all use them.
 */
import { isSkoleHost } from "./skole-host";

export type Site = "privat" | "erhverv" | "skole";

export const isErhvervHost = (host: string) => host.toLowerCase().startsWith("erhverv.");

export const siteOfHost = (host: string): Site => (isSkoleHost(host) ? "skole" : isErhvervHost(host) ? "erhverv" : "privat");

/** The main site's host: "erhverv.budgetpro.dk" → "budgetpro.dk", "www.budgetpro.dk" → "budgetpro.dk". */
export const rootHost = (host: string) => host.replace(/^(?:skole|erhverv|www)\./i, "");

/** Whether erhverv.<host> and skole.<host> can be used (not localhost, an IP address or a *.vercel.app preview). */
export function hasSubdomains(root: string): boolean {
  const name = root.replace(/:\d+$/, "").toLowerCase();
  return !(name === "localhost" || /^[\d.]+$/.test(name) || name.startsWith("[") || name.endsWith(".vercel.app"));
}

/** Each front page's address as seen from loc; a link to the page's own host is only its path. */
export function siteLinks(loc: { protocol: string; host: string }): Record<Site, string> {
  const root = rootHost(loc.host);
  const sub = hasSubdomains(root);
  const at = (host: string, path: string) => (host.toLowerCase() === loc.host.toLowerCase() ? path : `${loc.protocol}//${host}${path}`);
  return {
    privat: at(root, "/"),
    erhverv: sub ? at(`erhverv.${root}`, "/") : at(root, "/erhverv"),
    skole: sub ? at(`skole.${root}`, "/") : at(root, "/skole"),
  };
}

export type ErhvervRoute = { kind: "pass" } | { kind: "rewrite"; path: string } | { kind: "main" };

const FILE = /\.(?:svg|png|jpe?g|webp|gif|ico|js|mjs|css|map|json|txt|xml|woff2?|pdf|webmanifest|mp4)$/i;

/**
 * What to do with a request path on erhverv.<domain>: "/" is the Erhverv page, its files and API pass, and everything
 * else (log ind, opret, the app, /aftale) is sent to the same path on the main site, where its cookies live.
 */
export function erhvervRoute(pathname: string): ErhvervRoute {
  if (pathname === "/") return { kind: "rewrite", path: "/erhverv" };
  if (pathname === "/erhverv" || pathname.startsWith("/erhverv/") || pathname.startsWith("/_next/") || pathname.startsWith("/api/erhverv/") || pathname === "/api/besoeg") return { kind: "pass" };
  if (pathname.startsWith("/api/") || pathname.startsWith("/private/") || pathname.startsWith("/budgetr-app/")) return { kind: "main" };
  if (FILE.test(pathname)) return { kind: "pass" };
  return { kind: "main" };
}
