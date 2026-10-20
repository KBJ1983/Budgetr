import type { NextRequest } from "next/server";
import { isOwner } from "@/lib/owner-store";
import { ADMIN_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { loadLive } from "@/lib/traffic-store";

// "Lige nu" on the owner's traffic tab: visitors of the last few minutes by place and page (lib/traffic-store.ts).
// Anyone but the owner gets a plain 404, like /api/owner.
export async function GET(req: NextRequest) {
  if (!(await isOwner({ session: req.cookies.get(SESSION_COOKIE)?.value, admin: req.cookies.get(ADMIN_COOKIE)?.value }))) {
    return new Response(null, { status: 404 });
  }
  return Response.json(await loadLive(), { headers: { "Cache-Control": "no-store" } });
}
