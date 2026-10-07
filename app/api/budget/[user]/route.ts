import { after, type NextRequest } from "next/server";
import { isBudget, MAX_BYTES, readBudget, writeBudget } from "@/lib/budget-file";
import { touchActivity } from "@/lib/owner-store";
import { canAccess, readSession, SESSION_COOKIE } from "@/lib/session";

// Stored through lib/kv.ts (local disk, or Upstash Redis on Vercel). Test users need no auth (same trust level
// as the test-user login); a real account only with its own session cookie (lib/session.ts). 401 sends the app back to /login.
// Each allowed request also notes who used the budget, for the owner page's active users (lib/owner.ts).
async function denied(req: NextRequest, user: string) {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!(await canAccess(user, cookie))) return true;
  after(async () => {
    const s = await readSession(cookie);
    if (s?.user === user) await touchActivity(user, s.member ?? user).catch((e) => console.error("[budgetr] activity", e));
  });
  return false;
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/budget/[user]">) {
  const { user } = await ctx.params;
  if (await denied(req, user)) return new Response(null, { status: 401 });
  const json = await readBudget(user);
  if (json === null) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  return new Response(json, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function save(req: NextRequest, ctx: RouteContext<"/api/budget/[user]">) {
  const { user } = await ctx.params;
  if (await denied(req, user)) return new Response(null, { status: 401 });
  const text = await req.text();
  if (text.length > MAX_BYTES) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!isBudget(body)) return new Response(null, { status: 400 });
  await writeBudget(user, JSON.stringify(body));
  return new Response(null, { status: 204 });
}

export const PUT = save;
// navigator.sendBeacon (used when the tab closes) can only POST.
export const POST = save;
