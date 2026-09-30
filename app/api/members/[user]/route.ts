import type { NextRequest } from "next/server";
import { addMember, isMemberId, listLogins, removeMember } from "@/lib/accounts";
import { deliver } from "@/lib/auth-mail";
import { SESSION_COOKIE, sessionLogin } from "@/lib/session";

// Sharing a budget (lib/accounts.ts): who can log in to it, adding an e-mail (the primary only) and taking one off
// (the primary any member, a member only themselves). Test users have no accounts, so there is nothing to share.
const login = (req: NextRequest, user: string) => sessionLogin(user, req.cookies.get(SESSION_COOKIE)?.value);
const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest, ctx: RouteContext<"/api/members/[user]">) {
  const { user } = await ctx.params;
  const l = await login(req, user);
  if (!l) return new Response(null, { status: 401 });
  return Response.json({ ...listLogins(l.account), you: l.member?.id ?? null }, { headers: noStore });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/members/[user]">) {
  const { user } = await ctx.params;
  const l = await login(req, user);
  if (!l) return new Response(null, { status: 401 });
  if (l.member) return Response.json({ error: "primary" }, { status: 403 });
  let body: { firstName?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const r = await addMember(user, body ?? {});
  if (!r.ok) return Response.json({ error: r.error }, { status: 400 });
  try {
    const sent = await deliver(req.nextUrl.origin, r.link);
    return Response.json({ ...listLogins(r.link.account), you: null, devLink: sent.devLink }, { headers: noStore });
  } catch (e) {
    // The member stays on the list; they can still log in with their e-mail on the login page.
    console.error("[budgetr] invite mail failed", e);
    return Response.json({ ...listLogins(r.link.account), you: null, error: "mail" }, { status: 502, headers: noStore });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/members/[user]">) {
  const { user } = await ctx.params;
  const l = await login(req, user);
  if (!l) return new Response(null, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!isMemberId(id)) return new Response(null, { status: 400 });
  if (l.member && l.member.id !== id) return Response.json({ error: "primary" }, { status: 403 });
  if (!(await removeMember(user, id))) return new Response(null, { status: 404 });
  return new Response(null, { status: 204 });
}
