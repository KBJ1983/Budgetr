import type { NextRequest } from "next/server";
import { isEmail, normalizeEmail, requestLogin } from "@/lib/accounts";
import { deliver } from "@/lib/auth-mail";
import { noteSeatCode } from "@/lib/customer-seats";

// Mails a login link (a confirm link while the e-mail isn't confirmed). Same answer for unknown e-mails. A seat code
// sent along (/login?kode=…) is noted on the account and taken when the link or code is used.
export async function POST(req: NextRequest) {
  let body: { email?: unknown; kode?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const email = normalizeEmail(body?.email);
  if (!isEmail(email)) return Response.json({ error: "email" }, { status: 400 });
  try {
    const link = await requestLogin(email);
    if (link && body.kode) await noteSeatCode(link.account.id, body.kode);
    return Response.json(await deliver(req.nextUrl.origin, link));
  } catch (e) {
    console.error("[budgetr] login mail failed", e);
    return Response.json({ error: "mail" }, { status: 502 });
  }
}
