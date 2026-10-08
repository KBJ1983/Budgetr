import { sendMail } from "@/lib/auth-mail";
import { isEmail, normalizeEmail } from "@/lib/signup";
import { LIFETIMES, MAX_PUPILS, TRIN } from "@/lib/skole";
import { pupilAddress, requestOrigin, skoleBase } from "@/lib/skole-host";
import { classMail } from "@/lib/skole-mail";
import { classExpires, createClass } from "@/lib/skole-store";

// budgetpro Skole: a teacher makes a class (no login) and gets the overview link by mail. The link is also returned
// once, so the page can show it when the mail can't be sent; only a hash of its secret is kept.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const trin = Number(b.trin);
  const antal = Number(b.antal);
  const days = Number(b.days);
  const email = normalizeEmail(b.email);
  if (!TRIN.includes(trin) || !LIFETIMES.includes(days) || !Number.isInteger(antal) || antal < 1 || antal > MAX_PUPILS) {
    return Response.json({ error: "input" }, { status: 400 });
  }
  if (!isEmail(email)) return Response.json({ error: "email" }, { status: 400 });

  const { token, cls } = await createClass({ trin, count: antal, days, email });
  const { origin, host } = requestOrigin(req.headers, req.url);
  const base = `${origin}${skoleBase(host)}`;
  const link = `${base}/klasse/${token}`;
  const expires = classExpires(cls);
  const mailed = await sendMail(email, classMail({ trin, link, expires, codes: cls.codes, pupilAddress: pupilAddress(host), lostUrl: `${base}/laerer` })).catch((e) => {
    console.error("[skole] class mail failed", e);
    return false;
  });
  return Response.json({ token, trin, codes: cls.codes, expires: expires.toISOString(), mailed }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
