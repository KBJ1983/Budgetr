import { NextResponse, type NextRequest } from "next/server";
import { isSkoleHost, skoleRoute } from "./lib/skole-host";

// 1. Pre-launch gate: while SITE_PASSWORD is set, every request (pages, the app, API, files) needs HTTP Basic Auth
//    with that password. Any user name is accepted. Unset = open (local dev).
// 2. budgetpro Skole's subdomain (lib/skole-host.ts): on skole.<domain> the pages come from /skole and the rest of
//    the site is blocked.
export function proxy(request: NextRequest) {
  const locked = siteGate(request);
  if (locked) return locked;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (isSkoleHost(host)) {
    const r = skoleRoute(request.nextUrl.pathname);
    if (r.kind === "block") {
      return new NextResponse("Siden findes ikke.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    if (r.kind === "rewrite") {
      const url = request.nextUrl.clone();
      url.pathname = r.path;
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

function siteGate(request: NextRequest): NextResponse | null {
  const password = process.env.SITE_PASSWORD?.trim();
  if (!password) return null;

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {}
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (safeEqual(given, password)) return null;
  }

  return new NextResponse("Siden er ikke åben endnu.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="budgetpro", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
