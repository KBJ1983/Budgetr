import { cookies } from "next/headers";
import { makeTeacherSession, TEACHER_COOKIE, teacherCookieOptions } from "@/lib/session";
import { isEmail, normalizeEmail } from "@/lib/signup";
import { deliverTeacherMail } from "@/lib/skole-auth";
import { findTestTeacher, openTestTeacher } from "@/lib/skole-test-teachers";
import { requestTeacherLogin } from "@/lib/skole-teachers";

// budgetpro Skole: mails a login code + link to a teacher. The answer is the same whether or not the e-mail is a
// teacher, so nobody can find out which e-mails are in use. A test teacher's login (LÆRER1 …, lib/skole-test-teachers.ts)
// logs in at once instead ({ loggedIn: true }).
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const typed = (body as Record<string, unknown> | null)?.email;
  const test = findTestTeacher(typed);
  if (test) {
    const t = await openTestTeacher(test);
    (await cookies()).set(TEACHER_COOKIE, await makeTeacherSession(t.id), teacherCookieOptions);
    return Response.json({ ok: true, loggedIn: true }, { headers: { "Cache-Control": "no-store" } });
  }
  const email = normalizeEmail(typed);
  if (!isEmail(email)) return Response.json({ errors: { email: "Skriv en gyldig e-mail, fx navn@skole.dk." } }, { status: 400 });
  return Response.json(await deliverTeacherMail(req, await requestTeacherLogin(email)), { headers: { "Cache-Control": "no-store" } });
}
