import type { NextRequest } from "next/server";
import { maskEmail, maskPhone, readProfile } from "@/lib/profile";
import { canAccess, SESSION_COOKIE } from "@/lib/session";

// Where the user's notifications go, masked (test users need no auth; a real account needs its session).
// The app shows it under Indstillinger > Påmindelser; null = the profile has no such detail yet.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/profile/[user]">) {
  const { user } = await ctx.params;
  if (!(await canAccess(user, req.cookies.get(SESSION_COOKIE)?.value))) return new Response(null, { status: 401 });
  const p = await readProfile(user);
  return Response.json({ email: maskEmail(p.email), phone: maskPhone(p.phone) }, { headers: { "Cache-Control": "no-store" } });
}
