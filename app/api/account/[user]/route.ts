import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { deleteAccount } from "@/lib/accounts";
import { SESSION_COOKIE, sessionLogin } from "@/lib/session";

// Deleting one's own account and everything kept about it (lib/accounts.ts deleteAccount). Only the primary e-mail
// may, and only with the word the app asks for typed in, so a stray request can't do it; a member can only leave
// the budget (/api/members). Test users have no account and get 401.
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/account/[user]">) {
  const { user } = await ctx.params;
  const l = await sessionLogin(user, req.cookies.get(SESSION_COOKIE)?.value);
  if (!l) return new Response(null, { status: 401 });
  if (l.member) return Response.json({ error: "primary" }, { status: 403 });
  let body: { confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof body?.confirm !== "string" || body.confirm.trim().toUpperCase() !== "SLET") {
    return Response.json({ error: "confirm" }, { status: 400 });
  }
  if (!(await deleteAccount(user))) return new Response(null, { status: 404 });
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
