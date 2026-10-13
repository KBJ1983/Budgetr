import { sendMail } from "@/lib/auth-mail";
import { inquiryMail, validateInquiry } from "@/lib/erhverv";
import { saveInquiry, takeInquiry } from "@/lib/erhverv-store";
import { ownerEmails } from "@/lib/owner-store";

// The Erhverv page's contact form (lib/erhverv.ts). Saved in the store and mailed to the owner; "website" is a field
// people never see, so a filled one is a bot and gets the same answer without anything being saved.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 10_000) return new Response(null, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof body?.website === "string" && body.website.trim()) return Response.json({ ok: true });
  const r = validateInquiry(body);
  if (!r.ok) return Response.json({ errors: r.errors }, { status: 400 });
  if (!(await takeInquiry(r.value.email))) return Response.json({ error: "limit" }, { status: 429 });

  await saveInquiry(r.value);
  const mail = inquiryMail(r.value);
  for (const to of ownerEmails()) {
    try {
      await sendMail(to, mail, { replyTo: r.value.email });
    } catch (e) {
      // Saved already, so the owner still finds it; the sender gets the usual answer.
      console.error("[budgetr] inquiry mail failed", e);
    }
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
