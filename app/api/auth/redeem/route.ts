import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { displayName, redeem } from "@/lib/accounts";
import { makeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

// Uses a mailed link (POST from /login/bekraeft, never on GET): confirms the e-mail the first time and starts
// the session. The page then stores id + name in localStorage for the app, like the test-user login does.
export async function POST(req: NextRequest) {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const a = await redeem(body?.token);
  if (!a) return Response.json({ error: "expired" }, { status: 400 });
  (await cookies()).set(SESSION_COOKIE, await makeSession(a.id), sessionCookieOptions);
  return Response.json({ id: a.id, name: displayName(a) }, { headers: { "Cache-Control": "no-store" } });
}
