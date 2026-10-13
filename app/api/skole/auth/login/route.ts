import { isEmail, normalizeEmail } from "@/lib/signup";
import { deliverTeacherMail } from "@/lib/skole-auth";
import { requestTeacherLogin } from "@/lib/skole-teachers";

// budgetpro Skole: mails a login code + link to a teacher. The answer is the same whether or not the e-mail is a
// teacher, so nobody can find out which e-mails are in use.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const email = normalizeEmail((body as Record<string, unknown> | null)?.email);
  if (!isEmail(email)) return Response.json({ errors: { email: "Skriv en gyldig e-mail, fx navn@skole.dk." } }, { status: 400 });
  return Response.json(await deliverTeacherMail(req, await requestTeacherLogin(email)), { headers: { "Cache-Control": "no-store" } });
}
