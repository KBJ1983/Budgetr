import type { NextRequest } from "next/server";
import { loginName } from "@/lib/accounts";
import { sendMail } from "@/lib/auth-mail";
import { fileMail, MAX_FILE_BYTES, parseSend, takeSend } from "@/lib/send-file";
import { SESSION_COOKIE, sessionLogin } from "@/lib/session";
import { userById } from "@/lib/users";

// "Send på mail" (lib/send-file.ts). Only a real account's own session may send: test users need no login, so they
// could mail anyone from anywhere – they may only try it in development.
const DEV = process.env.NODE_ENV !== "production";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/send/[user]">) {
  const { user } = await ctx.params;
  const l = await sessionLogin(user, req.cookies.get(SESSION_COOKIE)?.value);
  const test = !l && DEV ? userById(user) : undefined;
  if (!l && !test) return Response.json({ error: "account" }, { status: 401 });

  const text = await req.text();
  if (text.length > MAX_FILE_BYTES * 1.4 + 4000) return Response.json({ error: "file" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const r = parseSend(body);
  if (!r.ok) return Response.json({ error: r.error }, { status: 400 });
  if (!(await takeSend(user))) return Response.json({ error: "limit" }, { status: 429 });

  const sender = l ? loginName(l) : test!.name;
  const senderEmail = l ? (l.member ?? l.account).email : "test-bruger";
  try {
    const sent = await sendMail(r.value.to, fileMail(sender, senderEmail, r.value), {
      replyTo: l ? senderEmail : undefined,
      attachments: [{ filename: r.value.filename, content: r.value.content }],
    });
    if (!sent && !DEV) return Response.json({ error: "mail" }, { status: 502 });
    return Response.json({ ok: true, ...(sent ? {} : { dev: true }) });
  } catch (e) {
    console.error("[budgetr] file mail failed", e);
    return Response.json({ error: "mail" }, { status: 502 });
  }
}
