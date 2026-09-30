import { NextResponse, type NextRequest } from "next/server";

// Pre-launch gate: while SITE_PASSWORD is set, every request (pages, the app, API, files)
// needs HTTP Basic Auth with that password. Any user name is accepted. Unset = open (local dev).
export function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD?.trim();
  if (!password) return NextResponse.next();

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {}
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (safeEqual(given, password)) return NextResponse.next();
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
