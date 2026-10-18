/**
 * budgetpro Skole's request helpers for teachers: who is logged in (the "budgetr_skole" cookie, lib/session.ts), and
 * sending the login mail with a link back to the address the teacher came from (also on the skole. subdomain).
 */
import { sendAuthMail } from "./auth-mail";
import { readTeacherSession } from "./session";
import { requestOrigin, skoleBase } from "./skole-host";
import { teacherMail } from "./skole-mail";
import { readTeacher, type Teacher, type TeacherMail } from "./skole-teachers";

const DEV = process.env.NODE_ENV !== "production";

/** The logged-in, confirmed teacher behind a cookie value, else null. */
export async function currentTeacher(cookie: string | undefined): Promise<Teacher | null> {
  const id = await readTeacherSession(cookie);
  const t = id ? await readTeacher(id) : null;
  return t?.verifiedAt ? t : null;
}

/**
 * Mails the code and link (null = nothing to send: unknown e-mail or throttled – the caller answers the same either
 * way). In development without a mail provider they come back as devLink and devCode so the page can show them.
 */
export async function deliverTeacherMail(req: Request, m: TeacherMail | null): Promise<{ ok: true; devLink?: string; devCode?: string }> {
  if (!m) return { ok: true };
  const { origin, host } = requestOrigin(req.headers, req.url);
  const link = `${origin}${skoleBase(host)}/laerer/bekraeft?t=${encodeURIComponent(m.token)}`;
  const sent = await sendAuthMail(m.teacher.email, teacherMail(m.purpose, m.teacher.name, m.code, link), link, { theme: "skole" });
  return !sent && DEV ? { ok: true, devLink: link, devCode: m.code } : { ok: true };
}
