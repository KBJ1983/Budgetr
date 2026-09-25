import type { NextRequest } from "next/server";
import { isBudget, MAX_BYTES, readBudget, writeBudget } from "@/lib/budget-file";
import { userById } from "@/lib/users";

// Local-disk storage for the test users (no auth – same trust level as the test-user login).

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/budget/[user]">) {
  const { user } = await ctx.params;
  if (!userById(user)) return new Response(null, { status: 404 });
  const json = await readBudget(user);
  if (json === null) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  return new Response(json, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function save(req: NextRequest, ctx: RouteContext<"/api/budget/[user]">) {
  const { user } = await ctx.params;
  if (!userById(user)) return new Response(null, { status: 404 });
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
