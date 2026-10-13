import { cookies } from "next/headers";
import { redeemAdminCode, redeemAdminLink } from "@/lib/agreement-admins";
import { AGREEMENT_COOKIE, agreementCookieOptions, makeAgreementSession } from "@/lib/session";

// /aftale: uses a mailed link ({ token }, POST from /aftale/bekraeft, never on GET) or the mailed code
// ({ email, code }, typed where it was asked for) and starts the kundeadmin's session.
export async function POST(req: Request) {
  let body: { token?: unknown; email?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const a = body?.code !== undefined ? await redeemAdminCode(body.email, body.code) : await redeemAdminLink(body?.token);
  if (!a) return Response.json({ error: "expired" }, { status: 400 });
  (await cookies()).set(AGREEMENT_COOKIE, await makeAgreementSession(a.id), agreementCookieOptions);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
