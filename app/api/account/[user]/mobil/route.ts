import type { NextRequest } from "next/server";
import { setPhone } from "@/lib/accounts";
import { maskPhone } from "@/lib/profile";
import { SESSION_COOKIE, sessionLogin } from "@/lib/session";
import { cleanPhone, PHONE_ERROR } from "@/lib/signup";

// The mobile number for SMS reminders (Indstillinger > Din bruger). The number is optional when signing up, so it can
// be added, changed or removed ("") here. Only the primary e-mail may: reminders go to the primary's profile, and a
// member is told so in the app. Answers with the masked number, never the number itself.
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/account/[user]/mobil">) {
  const { user } = await ctx.params;
  const l = await sessionLogin(user, req.cookies.get(SESSION_COOKIE)?.value);
  if (!l) return new Response(null, { status: 401 });
  if (l.member) return Response.json({ error: "primary" }, { status: 403 });
  let body: { phone?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const phone = cleanPhone(body?.phone);
  if (phone === null) return Response.json({ error: PHONE_ERROR }, { status: 400 });
  if (!(await setPhone(user, phone))) return new Response(null, { status: 404 });
  return Response.json({ phone: maskPhone(phone) });
}
