import type { NextRequest } from "next/server";
import { isEmail, normalizeEmail, requestLogin } from "@/lib/accounts";
import { deliver } from "@/lib/auth-mail";

// Mails a login link (a confirm link while the e-mail isn't confirmed). Same answer for unknown e-mails.
export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const email = normalizeEmail(body?.email);
  if (!isEmail(email)) return Response.json({ error: "email" }, { status: 400 });
  try {
    return Response.json(await deliver(req.nextUrl.origin, await requestLogin(email)));
  } catch (e) {
    console.error("[budgetr] login mail failed", e);
    return Response.json({ error: "mail" }, { status: 502 });
  }
}
