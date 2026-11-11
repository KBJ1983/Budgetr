/**
 * Limits on how often something may happen, kept in the store (lib/kv.ts `hit`), so they hold across server
 * instances and for requests sent at once: login codes, pupil codes, mails and forms.
 */
import { createHash } from "node:crypto";
import { openStore } from "./kv";

/** The visitor's IP as Vercel passes it on ("local" when there is none, e.g. in tests). */
export function clientIp(h: Headers): string {
  return (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Keys hold a hash of the e-mail or IP, never the value itself. */
const part = (s: string) => createHash("sha256").update(s.trim().toLowerCase()).digest("base64url").slice(0, 22);

/**
 * Counts one try of `what` for `who` and says whether it is within `max` per `windowS` seconds. The try is counted
 * also when it is refused, so hammering doesn't reopen the limit.
 */
export async function allow(what: string, who: string, max: number, windowS: number, dir?: string): Promise<boolean> {
  return (await openStore(dir).hit(`limit/${what}/${part(who)}`, windowS)) <= max;
}

/**
 * For limits that only count failures (e.g. wrong pupil codes – a whole class shares one school IP, so the right ones
 * must never be limited): whether `who` still has misses left, without counting anything.
 */
export async function missesLeft(what: string, who: string, max: number, windowS: number, dir?: string): Promise<boolean> {
  return (await openStore(dir).hit(`limit/${what}/${part(who)}`, windowS, 0)) < max;
}

/** Counts one miss for missesLeft. */
export async function noteMiss(what: string, who: string, windowS: number, dir?: string): Promise<void> {
  await openStore(dir).hit(`limit/${what}/${part(who)}`, windowS);
}

/** True when every limit allows the request; all of them are counted. */
export async function allowAll(limits: [what: string, who: string, max: number, windowS: number][], dir?: string): Promise<boolean> {
  const ok = await Promise.all(limits.map(([w, who, max, s]) => allow(w, who, max, s, dir)));
  return ok.every(Boolean);
}

export const HOUR = 60 * 60;
export const DAY = 24 * HOUR;

/** Typing mailed codes and links: per IP, on top of the tries per code (lib/accounts.ts and friends). */
export const redeemAllowed = (h: Headers, dir?: string) =>
  allowAll([["redeem-ip", clientIp(h), 30, HOUR], ["redeem-ip-day", clientIp(h), 120, DAY]], dir);

/**
 * Sending a mail from a form (login, sign-up, invites, files): per IP, per receiver and for the whole site per day,
 * so the forms can't be used to flood an inbox or to send mail in bulk from our domain.
 */
export const mailAllowed = (h: Headers, to: string, dir?: string) =>
  allowAll(
    [
      ["mail-ip", clientIp(h), 15, HOUR],
      ["mail-ip-day", clientIp(h), 50, DAY],
      ["mail-to", to, 6, HOUR],
      ["mail-to-day", to, 20, DAY],
      ["mail-all-day", "all", 3000, DAY],
    ],
    dir,
  );

/** The answer when a limit is reached. The forms show their "try again later" text for it. */
export const tooMany = () => Response.json({ error: "limit" }, { status: 429, headers: { "Cache-Control": "no-store" } });
