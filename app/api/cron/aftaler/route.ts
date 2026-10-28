import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { sendMail } from "@/lib/auth-mail";
import { remindAdmins } from "@/lib/agreement-reminders";
import { remindEndingSeats } from "@/lib/customer-seats";

const digest = (s: string) => createHash("sha256").update(s).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

// Daily job (Vercel Cron, vercel.json) for the agreements: mails bank and estate-agent customers a week before their
// seat ends (lib/customer-seats.ts remindEndingSeats), and kundeadmins a weekly status when seats wait unused or free
// seats can soon no longer be sent (lib/agreement-reminders.ts). Vercel sends "Authorization: Bearer <CRON_SECRET>";
// without CRON_SECRET the route only runs in development (open it in the browser to try it). Everyone else gets 404.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = secret ? safeEqual(given, secret) : process.env.NODE_ENV === "development";
  if (!ok) return new Response(null, { status: 404 });
  const origin = req.nextUrl.origin, site = process.env.APP_URL || origin;
  const send = (to: string, mail: { subject: string; text: string }) => sendMail(to, mail, { origin });
  const sent = await remindEndingSeats(send, `${site}/app`);
  const status = await remindAdmins(send, site);
  return Response.json({ sent, status }, { headers: { "Cache-Control": "no-store" } });
}
