import type { NextRequest } from "next/server";
import { isOwner } from "@/lib/owner-store";
import { ADMIN_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { addDays } from "@/lib/owner";
import { dayOf } from "@/lib/traffic";
import { loadReport } from "@/lib/traffic-store";

// The owner's traffic report (lib/traffic.ts): GET ?from=YYYY-MM-DD&to=YYYY-MM-DD&site=alle|privat|erhverv|skole.
// Without dates the last 30 days. Anyone but the owner gets a plain 404, like /api/owner.
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const SITES = ["alle", "privat", "erhverv", "skole"] as const;

export async function GET(req: NextRequest) {
  if (!(await isOwner({ session: req.cookies.get(SESSION_COOKIE)?.value, admin: req.cookies.get(ADMIN_COOKIE)?.value }))) {
    return new Response(null, { status: 404 });
  }
  const q = req.nextUrl.searchParams;
  const today = dayOf();
  const to = ISO.test(q.get("to") ?? "") ? q.get("to")! : today;
  const from = ISO.test(q.get("from") ?? "") ? q.get("from")! : addDays(to, -29);
  const site = SITES.find((s) => s === q.get("site")) ?? "alle";
  return Response.json(await loadReport(from, to, site), { headers: { "Cache-Control": "no-store" } });
}
