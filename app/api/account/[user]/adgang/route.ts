import type { NextRequest } from "next/server";
import { customerSeat, takeCustomerSeat } from "@/lib/customer-seats";
import { DEMO_USER, demoSeat } from "@/lib/demo-customer";
import { canAccess, SESSION_COOKIE } from "@/lib/session";
import { isAccountId } from "@/lib/users";

// A seat from a bank or estate agent (lib/customer-seats.ts), for real accounts with their session only.
// GET: the seat the budget has now ({ seat: null } without one). POST { kode }: takes the seat behind a code –
// from the app (Indstillinger > Din bruger) or /login when the user is already logged in.
async function allowed(req: NextRequest, user: string) {
  return isAccountId(user) && (await canAccess(user, req.cookies.get(SESSION_COOKIE)?.value));
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/account/[user]/adgang">) {
  const { user } = await ctx.params;
  // The demo family shows a seat from a made-up bank, so the demo has every part of the app (lib/demo-customer.ts).
  if (user === DEMO_USER) return Response.json({ seat: demoSeat() }, { headers: { "Cache-Control": "no-store" } });
  if (!(await allowed(req, user))) return new Response(null, { status: 401 });
  return Response.json({ seat: await customerSeat(user) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/account/[user]/adgang">) {
  const { user } = await ctx.params;
  if (!(await allowed(req, user))) return new Response(null, { status: 401 });
  let body: { kode?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const r = await takeCustomerSeat(user, body?.kode);
  return r.ok ? Response.json({ seat: r.seat }) : Response.json({ error: r.error }, { status: 400 });
}
