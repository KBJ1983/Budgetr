import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { sendMail } from "@/lib/auth-mail";
import { remindEndingSeats } from "@/lib/customer-seats";

const digest = (s: string) => createHash("sha256").update(s).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

// Daily job (Vercel Cron, vercel.json): mails bank and estate-agent customers a week before their seat ends
// (lib/customer-seats.ts remindEndingSeats). Vercel sends "Authorization: Bearer <CRON_SECRET>"; without CRON_SECRET the
// route only runs in development (open it in the browser to try it). Everyone else gets 404.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = secret ? safeEqual(given, secret) : process.env.NODE_ENV === "development";
  if (!ok) return new Response(null, { status: 404 });
  const appUrl = `${process.env.APP_URL || req.nextUrl.origin}/app`;
  const sent = await remindEndingSeats((to, mail) => sendMail(to, mail, { origin: req.nextUrl.origin }), appUrl);
  return Response.json({ sent }, { headers: { "Cache-Control": "no-store" } });
}
