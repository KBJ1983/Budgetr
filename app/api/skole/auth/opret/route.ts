import { validateTeacher } from "@/lib/skole";
import { deliverTeacherMail } from "@/lib/skole-auth";
import { signupTeacher } from "@/lib/skole-teachers";

// budgetpro Skole: a teacher signs up with name, school and e-mail and gets a code + link by mail. An e-mail that is
// already a teacher gets a login mail instead; the answer is the same either way.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const v = validateTeacher(body);
  if (!v.ok) return Response.json({ errors: v.errors }, { status: 400 });
  return Response.json(await deliverTeacherMail(req, await signupTeacher(v.value)), { headers: { "Cache-Control": "no-store" } });
}
