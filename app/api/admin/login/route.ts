import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { adminLogin } from "@/lib/owner-store";
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/session";

// The owner's password login for /admin (lib/owner-store.ts): POST { email, password } sets the admin cookie,
// DELETE logs out.
export async function POST(req: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const r = await adminLogin(body?.email, body?.password);
  if (!r.ok) return Response.json({ error: r.error }, { status: r.error === "locked" ? 429 : 401 });
  (await cookies()).set(ADMIN_COOKIE, r.cookie, adminCookieOptions);
  return new Response(null, { status: 204 });
}

export async function DELETE() {
  (await cookies()).delete(ADMIN_COOKIE);
  return new Response(null, { status: 204 });
}
