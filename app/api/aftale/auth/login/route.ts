import type { NextRequest } from "next/server";
import { requestAdminLogin } from "@/lib/agreement-admins";
import { deliverAdminLogin } from "@/lib/agreement-auth";
import { isEmail, normalizeEmail } from "@/lib/signup";

// /aftale: mails a login code + link to a kundeadmin. The answer is the same whether or not the e-mail is a
// kundeadmin, so nobody can find out which e-mails run an agreement.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const email = normalizeEmail((body as Record<string, unknown> | null)?.email);
  if (!isEmail(email)) return Response.json({ error: "email" }, { status: 400 });
  try {
    return Response.json(await deliverAdminLogin(req.nextUrl.origin, await requestAdminLogin(email)), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[budgetr] kundeadmin login mail failed", e);
    return Response.json({ error: "mail" }, { status: 502 });
  }
}
