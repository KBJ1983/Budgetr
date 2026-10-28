/**
 * The weekly status mail to an agreement's kundeadmins (lib/agreement-mail.ts adminDigestMail): seats sent at least
 * UNUSED_DAYS ago and not used yet, and free seats in a pack whose last day to send is within ENDING_DAYS. Run daily by
 * the cron route app/api/cron/aftaler; each organisation gets it at most every DIGEST_EVERY_DAYS, and only when there
 * is something to say. When it went out is kept in aftaler/<orgId>/status-mail.json.
 */
import { adminDigestMail } from "./agreement-mail";
import { listGrants, packUse } from "./agreements";
import { openStore } from "./kv";
import { addDays, orgActive, today } from "./owner";
import { readLedger } from "./owner-store";

export const UNUSED_DAYS = 14;
export const ENDING_DAYS = 30;
export const DIGEST_EVERY_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const lastKey = (orgId: string) => `aftaler/${orgId}/status-mail.json`;

/** Sends the due status mails. `send` returns false without a mail provider (then nothing is noted). Returns how many organisations got one. */
export async function remindAdmins(
  send: (to: string, mail: { subject: string; text: string }) => Promise<boolean>,
  siteUrl: string,
  now = new Date(),
  dir?: string,
): Promise<number> {
  const store = openStore(dir), day = today(now);
  let done = 0;
  for (const org of (await readLedger(dir)).orgs) {
    if (!org.admins?.length || !org.packs?.length || !orgActive(org, day)) continue;
    const last = await store.get(lastKey(org.id));
    if (last && now.getTime() - Date.parse(JSON.parse(last).at) < DIGEST_EVERY_DAYS * DAY_MS - 60 * 60 * 1000) continue;
    const grants = await listGrants(org.id, dir);
    const unused = grants.filter((g) => !g.usedBy && day <= g.sendBy && now.getTime() - Date.parse(g.sends.at(-1) ?? g.sentAt) >= UNUSED_DAYS * DAY_MS).length;
    const use = packUse(grants), soon = addDays(day, ENDING_DAYS);
    const ending = org.packs
      .filter((p) => p.bought <= day && day <= p.sendBy && p.sendBy <= soon)
      .map((p) => ({ free: p.count - (use[p.id]?.sent ?? 0), sendBy: p.sendBy }))
      .filter((p) => p.free > 0);
    if (!unused && !ending.length) continue;
    const mail = adminDigestMail({ orgName: org.name, unused, unusedDays: UNUSED_DAYS, ending, link: `${siteUrl}/aftale?org=${encodeURIComponent(org.id)}` });
    let sent = false;
    for (const to of org.admins) {
      try {
        sent = (await send(to, mail)) || sent;
      } catch (e) {
        console.error("[budgetr] status mail failed", e);
      }
    }
    if (sent) {
      await store.set(lastKey(org.id), JSON.stringify({ at: now.toISOString() }));
      done++;
    }
  }
  return done;
}
