import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { sendMail } from "@/lib/auth-mail";
import { runReminders, sendSms } from "@/lib/reminder-run";

const digest = (s: string) => createHash("sha256").update(s).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

// Daily job (Vercel Cron, vercel.json): the update reminders and the reminders about open tasks, by mail and SMS as
// each user chose (lib/reminder-run.ts). Same guard as /api/cron/aftaler: "Authorization: Bearer <CRON_SECRET>", open
// only in development without it, 404 for everyone else. Answers with counts only – no addresses.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = secret ? safeEqual(given, secret) : process.env.NODE_ENV === "development";
  if (!ok) return new Response(null, { status: 404 });
  const origin = req.nextUrl.origin;
  const results = await runReminders({
    appUrl: `${process.env.APP_URL || origin}/app`,
    send: { mail: (to, subject, text) => sendMail(to, { subject, text }, { origin }), sms: process.env.GATEWAYAPI_TOKEN ? sendSms : undefined },
  });
  const sent = results.filter((r) => r.sent.length).length, failed = results.filter((r) => r.failed.length && !r.sent.length).length;
  return Response.json({ due: results.length, sent, failed }, { headers: { "Cache-Control": "no-store" } });
}
