/**
 * budgetpro Skole on its own subdomain. On a host starting with "skole." (skole.<domain> in production,
 * skole.localhost:3200 in development) page paths are served from /skole: "/" is the pupils' start page, "/laerer"
 * the teacher page, "/klasse/<token>" the overview. The rest of the site (the app, login, other APIs) is not
 * reachable there. Pure functions: proxy.ts and the browser both use them.
 */

export const isSkoleHost = (host: string) => host.toLowerCase().startsWith("skole.");

export type SkoleRoute = { kind: "pass" } | { kind: "block" } | { kind: "rewrite"; path: string };

// Files from public/ and Next's own; a teacher token ("<hex>.<24 chars>") never ends like one of these.
const FILE = /\.(?:svg|png|jpe?g|webp|gif|ico|js|mjs|css|map|json|txt|xml|woff2?|pdf|webmanifest)$/i;

/** What to do with a request path on the school host. */
export function skoleRoute(pathname: string): SkoleRoute {
  if (pathname === "/skole" || pathname.startsWith("/skole/") || pathname.startsWith("/_next/") || pathname.startsWith("/api/skole/")) return { kind: "pass" };
  if (pathname.startsWith("/api/") || pathname.startsWith("/private/") || pathname.startsWith("/budgetr-app/index")) return { kind: "block" };
  if (FILE.test(pathname)) return { kind: "pass" };
  return { kind: "rewrite", path: pathname === "/" ? "/skole" : `/skole${pathname}` };
}

/** The school pages' path prefix as the visitor sees it: "" on the subdomain, "/skole" elsewhere. */
export const skoleBase = (host: string) => (isSkoleHost(host) ? "" : "/skole");

/** The address pupils type, for the printed codes: "skole.budgetpro.dk" or "budgetpro.dk/skole". */
export const pupilAddress = (host: string) => `${host}${skoleBase(host)}`;

/**
 * The address of the request as the visitor sees it, for links in mails: "https://skole.budgetpro.dk" or
 * "http://localhost:3200". Behind Vercel the public host and scheme come in the x-forwarded-* headers.
 */
export function requestOrigin(headers: { get(name: string): string | null }, url: string): { origin: string; host: string } {
  const u = new URL(url);
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? u.host;
  const proto = headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  return { origin: `${proto}://${host}`, host };
}

/** The main site, for "Prøv budgetpro": the same domain without "skole.", or "/" when already on it. */
export function mainSiteUrl(loc: { protocol: string; host: string }): string {
  return isSkoleHost(loc.host) ? `${loc.protocol}//${loc.host.slice("skole.".length)}/` : "/";
}
