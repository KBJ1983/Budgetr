import { cookies } from "next/headers";
import { makeTeacherSession, TEACHER_COOKIE, teacherCookieOptions } from "@/lib/session";
import { redeemTeacherCode, redeemTeacherLink } from "@/lib/skole-teachers";

// budgetpro Skole: uses a mailed link ({ token }, POST from /skole/laerer/bekraeft, never on GET) or the mailed code
// ({ email, code }, typed where it was asked for) and starts the teacher's session.
export async function POST(req: Request) {
  let body: { token?: unknown; email?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const t = body?.code !== undefined ? await redeemTeacherCode(body.email, body.code) : await redeemTeacherLink(body?.token);
  if (!t) return Response.json({ error: "expired" }, { status: 400 });
  (await cookies()).set(TEACHER_COOKIE, await makeTeacherSession(t.id), teacherCookieOptions);
  return Response.json({ name: t.name }, { headers: { "Cache-Control": "no-store" } });
}
