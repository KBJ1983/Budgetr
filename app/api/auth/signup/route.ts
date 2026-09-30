import type { NextRequest } from "next/server";
import { signup, validateSignup } from "@/lib/accounts";
import { deliver } from "@/lib/auth-mail";

// Sign up: checks the form and mails a confirm link. The answer is the same whether or not the e-mail already
// had an account (that account gets a login link instead), so the form can't be used to find out who is a user.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const v = validateSignup(body);
  if (!v.ok) return Response.json({ errors: v.errors }, { status: 400 });
  try {
    return Response.json(await deliver(req.nextUrl.origin, await signup(v.value)));
  } catch (e) {
    console.error("[budgetr] signup mail failed", e);
    return Response.json({ error: "mail" }, { status: 502 });
  }
}
