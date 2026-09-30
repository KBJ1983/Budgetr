import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { loginName, redeem, redeemCode } from "@/lib/accounts";
import { makeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

// Uses a mailed link ({ token }, POST from /login/bekraeft, never on GET) or the mailed code ({ email, code }, from
// /login and /opret on the device that asked for it): confirms the e-mail the first time and starts the session.
// The page then stores id + name in localStorage for the app, like the test-user login does.
export async function POST(req: NextRequest) {
  let body: { token?: unknown; email?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const l = body?.code !== undefined ? await redeemCode(body.email, body.code) : await redeem(body?.token);
  if (!l) return Response.json({ error: "expired" }, { status: 400 });
  // A member of a shared budget gets a session for that budget, marked with the member (lib/session.ts).
  (await cookies()).set(SESSION_COOKIE, await makeSession(l.account.id, undefined, undefined, l.member?.id), sessionCookieOptions);
  return Response.json({ id: l.account.id, name: loginName(l) }, { headers: { "Cache-Control": "no-store" } });
}
