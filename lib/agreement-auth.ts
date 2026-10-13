/**
 * Request helpers for /aftale: who is logged in (the "budgetr_aftale" cookie, lib/session.ts) and the mails –
 * the kundeadmin's login, the note to a new kundeadmin, and the seat mail (the only place a code is ever shown).
 */
import { adminInviteMail, adminLoginMail, grantMail } from "./agreement-mail";
import { adminWithOrgs, type AdminMail, type AgreementAdmin } from "./agreement-admins";
import { formatCode, type Grant } from "./agreements";
import { sendAuthMail, sendMail } from "./auth-mail";
import type { Org } from "./owner";
import { readAgreementSession } from "./session";

const DEV = process.env.NODE_ENV !== "production";

/** Links in mails: APP_URL when set, else where the request came from. */
export const siteUrl = (origin: string) => process.env.APP_URL || origin;

/** The logged-in kundeadmin and the agreement they work on (`orgId`, or their first). Null = log in again. */
export async function currentAgreement(cookie: string | undefined, orgId?: string | null): Promise<{ admin: AgreementAdmin; orgs: Org[]; org: Org } | null> {
  const who = await adminWithOrgs(await readAgreementSession(cookie));
  if (!who) return null;
  const org = orgId ? who.orgs.find((o) => o.id === orgId) : who.orgs[0];
  return org ? { ...who, org } : null;
}

/** Mails the login code + link; in development without a mail provider they come back for the page to show. */
export async function deliverAdminLogin(origin: string, m: AdminMail | null): Promise<{ ok: true; devLink?: string; devCode?: string }> {
  if (!m) return { ok: true };
  const link = `${siteUrl(origin)}/aftale/bekraeft?t=${encodeURIComponent(m.token)}`;
  const sent = await sendAuthMail(m.admin.email, adminLoginMail(m.code, link), link);
  return !sent && DEV ? { ok: true, devLink: link, devCode: m.code } : { ok: true };
}

/**
 * Tells new kundeadmins they can log in; true when every mail went out. Errors are logged, not thrown: the change
 * itself is already saved.
 */
export async function inviteAdmins(origin: string, org: Org, emails: string[], by?: string): Promise<boolean> {
  let all = true;
  for (const to of emails) {
    try {
      // The login page opens with the e-mail filled in, so one press sends the code.
      all = (await sendMail(to, adminInviteMail(org.name, `${siteUrl(origin)}/aftale?email=${encodeURIComponent(to)}`, by))) && all;
    } catch (e) {
      console.error("[budgetr] kundeadmin mail failed", e);
      all = false;
    }
  }
  return all;
}

/** Mails a seat. False when no mail provider is set up – the code is never handed back, not even in development. */
export async function mailGrant(origin: string, org: Org, grant: Grant, code: string): Promise<boolean> {
  const shown = formatCode(code);
  const link = `${siteUrl(origin)}/aftale/brug?kode=${shown}`;
  const mail = grantMail({ orgName: org.name, category: org.category, months: grant.months, sendBy: grant.sendBy, code: shown, link });
  return sendAuthMail(grant.email, mail, link);
}
