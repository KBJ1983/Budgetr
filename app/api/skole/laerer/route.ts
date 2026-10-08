import { sendMail } from "@/lib/auth-mail";
import { isEmail, normalizeEmail } from "@/lib/signup";
import { requestOrigin, skoleBase } from "@/lib/skole-host";
import { linksMail } from "@/lib/skole-mail";
import { classExpires, newTeacherLinks } from "@/lib/skole-store";

// budgetpro Skole, "Har du mistet linket?": mails new links to every live class made with this e-mail. The answer is
// the same whether or not the e-mail has classes, so nobody can find out which e-mails are in use.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const email = normalizeEmail((body as Record<string, unknown> | null)?.email);
  if (!isEmail(email)) return Response.json({ error: "email" }, { status: 400 });

  const links = await newTeacherLinks(email);
  if (links !== "throttled" && links.length) {
    const { origin, host } = requestOrigin(req.headers, req.url);
    const base = `${origin}${skoleBase(host)}`;
    await sendMail(email, linksMail(links.map((l) => ({ trin: l.cls.trin, link: `${base}/klasse/${l.token}`, expires: classExpires(l.cls) })))).catch((e) =>
      console.error("[skole] links mail failed", e),
    );
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
