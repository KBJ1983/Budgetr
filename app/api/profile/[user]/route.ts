import type { NextRequest } from "next/server";
import { maskEmail, maskPhone, readProfile } from "@/lib/profile";
import { userById } from "@/lib/users";

// Where the user's notifications go, masked (no auth – same trust level as the test-user login).
// The app shows it under Indstillinger > Påmindelser; null = the profile has no such detail yet.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/profile/[user]">) {
  const { user } = await ctx.params;
  if (!userById(user)) return new Response(null, { status: 404 });
  const p = await readProfile(user);
  return Response.json({ email: maskEmail(p.email), phone: maskPhone(p.phone) }, { headers: { "Cache-Control": "no-store" } });
}
